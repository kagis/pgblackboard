#![feature(read_exact)]
#![feature(str_char)]
#![feature(slice_patterns)]
#![feature(duration)]
#![feature(socket_timeout)]

//! ```rust
//! extern crate rustc_serialize;
//! use rustc_serialize;
//! use postgres;
//!
//! let mut conn = postgres::connect("localhost:5432",
//!                        "postgres",
//!                        "postgres",
//!                        "postgres").unwrap();
//! #[derive(RustcDecodable, PartialEq, Debug)]
//! struct Foo {
//!     id: i32,
//!     name: String,
//! }
//! let items = conn.query::<Foo>("select 1, 'one'").unwrap();
//! assert_eq!(items, vec![
//!     Foo { id: 1, name: "one".to_string() }
//! ]);
//! ```

extern crate rustc_serialize;

mod decoder;
mod sql;
mod messaging;
mod md5;

pub use sql::{quote_ident, quote_literal, split_statements};

use messaging::{
    MessageStream,
    BackendMessage,
    FieldDescription,
    ErrorOrNotice,
    SqlError,
    Notice,
    TransactionStatus,
    Row,
    SqlState,

    FrontendMessage,
    StartupMessage,
    PasswordMessage,
    ParseMessage,
    BindMessage,
    ExecuteMessage,
    DescribeStatementMessage,
    TerminateMessage,
    FlushMessage,
    SyncMessage,
};


use md5::Md5;
use rustc_serialize::{Decodable};

use std::io;
use std::mem;
use std::net::{TcpStream, ToSocketAddrs};
use std::collections::BTreeMap;


#[derive(Debug)]
pub enum Error {
    SqlError(SqlError),
    IoError(io::Error)
}


type InternalStream = TcpStream;




#[derive(Debug)]
#[derive(PartialEq)]
pub enum ExecutionEvent {
    NonQueryExecuted(String),
    RowsetBegin(Vec<FieldDescription>),
    RowFetched(Row),
    RowsetEnd { is_explain: bool },
    SqlErrorOccured(ErrorOrNotice),
    IoErrorOccured(String),
    Notice(ErrorOrNotice),
}









// #[derive(Debug)]
// pub enum PgError {
//     //AuthenticationError,
//     //DatabaseNotExists,
//     UnexpectedMessage(BackendMessage),
//     ErrorMessage(ErrorOrNotice),
//     TransportError(io::Error),
// }

// impl ::std::error::Error for PgError {
//     fn description(&self) -> &str {
//         use self::PgError::*;
//         match *self {
//             UnexpectedMessage(..) => "Unexpected message recived from server.",
//             ErrorMessage(..) => "Error message recived from server.",
//             TransportError(..) => "Transport error.",
//         }
//     }

//     fn detail(&self) -> Option<String> {
//         use self::PgError::*;
//         match *self {
//             UnexpectedMessage(ref msg) => Some(format!("{:?}", msg)),
//             ErrorMessage(ref err) => Some(format!("{:?}", err)),
//             TransportError(ref err) => err.detail(),
//         }
//     }

//     fn cause(&self) -> Option<&::std::error::Error> {
//         use self::PgError::TransportError;
//         match *self {
//             TransportError(ref err) => Some(err as &::std::error::Error),
//             _ => None
//         }
//     }
// }

// impl ::std::error::FromError<io::Error> for PgError {
//     fn from_error(err: io::Error) -> PgError {
//         PgError::TransportError(err)
//     }
// }

// pub type PgResult<T> = Result<T, PgError>;

pub type ConnectionResult = Result<Connection, ConnectionError>;

#[derive(Debug)]
pub enum ConnectionError {
    AuthFailed,
    DatabaseNotExists,
    UnsupportedAuthMethod,

    /// Occurs when password was not requested by
    /// postgres server during authentication phase.
    NoPasswordRequested,

    ErrorResponse(ErrorOrNotice),
    IoError(io::Error),
}

impl ::std::convert::From<io::Error> for ConnectionError {
    fn from(err: io::Error) -> ConnectionError {
        ConnectionError::IoError(err)
    }
}

// enum ConnectionError {
//     AuthenticationFailed,
//     TransportError,
//     BadResponse,
// }

// pub struct ConnectParams {
//     pub user: String,
//     pub password: String,
//     pub database: String,
//     pub port: Port,
//     pub host: String,
// }


pub struct Connection {
    stream: messaging::MessageStream<InternalStream>,
    transaction_status: TransactionStatus,
    notices: Vec<Notice>,
    is_desynchronized: bool,
}

// pub enum StatementResult {
//     NonQuery(String),
//     Rowset(Vec<FieldDescription>),
// }

pub fn connect<T>(addr: T,
                  database: &str,
                  user: &str,
                  password: &str)
                  -> ConnectionResult
                  where T: ToSocketAddrs
{
    use std::time::Duration;
    let stream = try!(InternalStream::connect(addr));
    stream.set_read_timeout(Some(Duration::new(1, 0)));

    Connection::connect_database(stream,
                                 database,
                                 user,
                                 password)
}


pub struct StmtName(String);

impl Connection {

    fn connect_database(stream: InternalStream,
                        database: &str,
                        user: &str,
                        password: &str)
                        -> ConnectionResult
    {

        let mut stream = messaging::MessageStream::new(stream);

        try!(stream.write_message(messaging::StartupMessage {
            user: user,
            database: database
        }));

        let mut password_was_requested = false;
        loop {
            match try!(stream.read_message()) {

                BackendMessage::AuthenticationMD5Password { salt } => {
                    let mut hasher = Md5::new();
                    hasher.input(password.as_bytes());
                    hasher.input(user.as_bytes());
                    let pwduser_hash = hasher.result_str();
                    hasher.reset();
                    hasher.input(pwduser_hash.as_bytes());
                    hasher.input(&salt);
                    let output = format!("md5{}", hasher.result_str());
                    try!(stream.write_message(PasswordMessage { password: &output }));
                    password_was_requested = true;
                }

                BackendMessage::AuthenticationCleartextPassword => {
                     try!(stream.write_message(PasswordMessage { password: password }));
                    password_was_requested = true;
                }

                BackendMessage::AuthenticationSSPI
                | BackendMessage::AuthenticationSCMCredential
                | BackendMessage::AuthenticationGSS => {
                    return Err(ConnectionError::UnsupportedAuthMethod);
                }

                BackendMessage::AuthenticationOk => {
                    if !password_was_requested {
                        return Err(ConnectionError::NoPasswordRequested);
                    }
                }

                BackendMessage::ErrorResponse(e) => {
                    return Err(match e.code {
                        SqlState::InvalidAuthorizationSpecification(..) => {
                            ConnectionError::AuthFailed
                        }

                        SqlState::InvalidCatalogName(..) => {
                            ConnectionError::DatabaseNotExists
                        }

                        _ => ConnectionError::ErrorResponse(e),
                    });
                }

                BackendMessage::BackendKeyData { .. } => {}

                BackendMessage::ParameterStatus { .. } => {}

                BackendMessage::ReadyForQuery { .. } => break,

                unexpected => return Err(ConnectionError::IoError(io::Error::new(io::ErrorKind::Other,
                                                               "Unexpected message while startup.",
                                                               //Some(format!("{:?}", unexpected))
                                                               ))),
            }
        }

        Ok(Connection {
            stream: stream,
            transaction_status: TransactionStatus::Idle,
            notices: vec![],
            is_desynchronized: false,
        })
    }

    fn wait_for_ready(&mut self) -> Result<(), Error> {
        match try!(self.read_message()) {
            BackendMessage::ReadyForQuery { transaction_status } => {
                self.transaction_status = transaction_status;
                Ok(())
            },
            ref unexpected => Err(self.bad_response(unexpected))
        }
    }

    fn read_message(&mut self) -> Result<BackendMessage, Error> {
        loop {
            let message = match self.stream.read_message() {
                Ok(message) => message,
                Err(err) => {
                    self.is_desynchronized = true;
                    return Err(Error::IoError(err));
                }
            };

            match message {
                BackendMessage::NotificationResponse { .. } => {

                }
                BackendMessage::NoticeResponse(notice) => {
                    self.notices.push(notice);
                }
                other => return Ok(other)
            }
        }
    }

    fn write_message<T: FrontendMessage>(&mut self, msg: T) -> Result<(), Error> {
        self.stream.write_message(msg).map_err(|err| {
            self.is_desynchronized = true;
            Error::IoError(err)
        })
        // match self.stream.write_message(msg) {
        //     Ok(()) => Ok(()),
        //     Err(err) => {
        //         self.is_desynchronized = true;
        //         err
        //     }
        // }
    }

    fn bad_response(&mut self, msg: &BackendMessage) -> Error {
        self.is_desynchronized = true;
        Error::IoError(io::Error::new(
            io::ErrorKind::Other,
            format!("Unexpected message from postgres: {:#?}", msg)
        ))
    }

    pub fn take_notices(&mut self) -> Vec<Notice> {
        mem::replace(&mut self.notices, vec![])
    }

    pub fn parse_statement(&mut self, stmt_name: &str, stmt_body: &str) -> Result<(), Error> {

        try!(self.write_message(ParseMessage {
            stmt_name: stmt_name,
            stmt_body: stmt_body
        }));

        try!(self.write_message(SyncMessage));

        match try!(self.read_message()) {
            BackendMessage::ParseComplete => {
                try!(self.wait_for_ready());
                Ok(())
            }
            BackendMessage::ErrorResponse(sql_err) => {
                try!(self.wait_for_ready());
                Err(Error::SqlError(sql_err))
            }
            ref unexpected => Err(self.bad_response(unexpected))
        }
    }

    pub fn describe_statement(&mut self, stmt_name: &str) -> Result<Vec<FieldDescription>, Error> {
        try!(self.write_message(DescribeStatementMessage {
            stmt_name: stmt_name
        }));

        try!(self.write_message(SyncMessage));

        match try!(self.read_message()) {
            BackendMessage::ParameterDescription { typ_ids } => {

            }
            BackendMessage::ErrorResponse(sql_err) => {
                try!(self.wait_for_ready());
                return Err(Error::SqlError(sql_err))
            }
            ref unexpected => return Err(self.bad_response(unexpected))
        }

        match try!(self.read_message()) {
            BackendMessage::RowDescription(row_descr) => {
                try!(self.wait_for_ready());
                Ok(row_descr)
            }
            BackendMessage::NoData => {
                try!(self.wait_for_ready());
                Ok(vec![])
            }
            BackendMessage::ErrorResponse(sql_err) => {
                try!(self.wait_for_ready());
                Err(Error::SqlError(sql_err))
            }
            ref unexpected => Err(self.bad_response(unexpected))
        }
    }

    pub fn execute_statement(mut self, stmt_name: &str, params: &[Option<&str>]) -> Result<Cursor, Error> {
        try!(self.write_message(BindMessage {
            stmt_name: stmt_name,
            portal_name: "",
            params: params
        }));

        try!(self.write_message(ExecuteMessage {
            portal_name: "",
            row_limit: 0
        }));

        try!(self.write_message(SyncMessage));

        match try!(self.read_message()) {
            BackendMessage::BindComplete => {},
            unexpected => return Err(self.bad_response(&unexpected))
        }

        Ok(Cursor::new(self))
    }

    pub fn execute_nonquery(&mut self, script: &str) -> Result<Vec<StatementSuccess>, ExecutionError> {
        self.execute(script, 0)
    }

    /// Collects results in memory
    pub fn execute(&mut self, script: &str, max_rows: usize) -> Result<Vec<StatementSuccess>, ExecutionError> {

        // try!(self.write_message(script));

        let mut maybe_sql_err = None;
        let mut stmt_successes = vec![];
        let mut row_descr = vec![];
        let mut rows_received = 0;
        let mut rows = vec![];

        loop {
            match try!(self.stream.read_message()) {

                BackendMessage::EmptyQueryResponse => { /* pass */ },

                BackendMessage::RowDescription(descr) => {
                    row_descr = descr;
                }

                BackendMessage::DataRow(row) => {
                    rows_received += 1;
                    if rows.len() < max_rows {
                        rows.push(row);
                    }
                }

                BackendMessage::CommandComplete { command_tag } => {
                    stmt_successes.push(StatementSuccess {
                        command_tag: command_tag,
                        is_rowset: !row_descr.is_empty(),
                        row_description: row_descr,
                        rows_received: rows_received,
                        rows_ignored: rows_received - rows.len(),
                        rows: rows,
                        notices: vec![],
                    });

                    row_descr = vec![];
                    rows_received = 0;
                    rows = vec![];
                }

                BackendMessage::ErrorResponse(sql_err) => {
                    maybe_sql_err = Some(sql_err);
                }

                BackendMessage::ReadyForQuery { transaction_status } => {
                    self.transaction_status = transaction_status;
                    break;
                }

                other => {
                    println!("ignored message {:#?}", other);
                }
            }
        }

        if let Some(sql_err) = maybe_sql_err {
            Err(ExecutionError::SqlError(sql_err))
        } else {
            Ok(stmt_successes)
        }
    }

    /// Produces event stream
    // pub fn execute_iter(mut self, script: &str) -> ExecutionEventIterator {
    //     sql::split(script).map(|stmt| self.execute_script)

    //     self.execute_script(script)
    // }

    // pub fn execute_script(&mut self, script: &str) -> io::Result<ExecutionEventIterator> {
    //     try!(self.stream.write_query_message(script));
    //     Ok(ExecutionEventIterator::new(&mut self.stream))
    // }

    fn begin_transation(&mut self) -> Result<Transaction, ExecutionError> {
        Transaction::begin(self)
    }

    pub fn insert_row(&mut self,
                      schema_name: &str,
                      table_name: &str,
                      inserting_row: &BTreeMap<String, Option<String>>)
                      -> Result<BTreeMap<String, Option<String>>, TableModifyError>
    {
        let (stmt, valpos_map) = {
            use std::fmt::Write;
            // INSERT INTO {schema_name}.{table_name} ({columns})
            //      VALUES ({values})
            //   RETURNING *

            // struct CommaCollect<I>(I);

            // impl<I, D> ::std::fmt::Display for CommaCollect<I>
            //     where I: Iterator<Item=D>,
            //           D: ::std::fmt::Display
            // {

            // }

            // impl<D> ::core::iter::FromIterator<D> for CommaCollect
            let mut stmt = String::new();
            write!(stmt, "INSERT INTO {schema_name}.{table_name} ({columns}) VALUES (",
                    schema_name = quote_ident(schema_name),
                    table_name = quote_ident(table_name),
                    columns = inserting_row.keys().map(|it| &it[..]).collect::<Vec<_>>().connect(",")
            ).unwrap();

            let mut valpos_map = BTreeMap::new();
            for (i, (key, maybe_val)) in inserting_row.iter().enumerate() {
                if i > 0 {
                    stmt.push(',');
                }
                valpos_map.insert(key, stmt.len() + 1);
                match *maybe_val {
                    Some(ref val) => { write!(stmt, "{}", quote_literal(val)); }
                    None => { stmt.push_str("NULL"); }
                }
            }
            write!(stmt, ") RETURNING *").unwrap();
            (stmt, valpos_map)
        };

        let mut tran = try!(self.begin_transation());
        let stmt_successes = try!(tran.execute(&stmt, /* max_rows: */ 1));

        // try!(self.stream.write_query_message("BEGIN"));
        // loop {
        //     match try!(self.stream.read_message()) {
        //         BackendMessage::
        //         BackendMessage::ReadyForQuery { .. } => break,
        //     }
        // }

        Ok(BTreeMap::new())
    }

    pub fn update_row(&mut self,
                      schema_name: &str,
                      table_name: &str,
                      key: &BTreeMap<String, Option<String>>,
                      changes: &BTreeMap<String, Option<String>>)
                      -> Result<BTreeMap<String, Option<String>>, TableModifyError>
    {
        fn col_assign_val((col, maybe_val): (&String, &Option<String>)) -> String {
            let quoted_col = quote_ident(col);
            match maybe_val.as_ref() {
                Some(val) => format!("{}={}", quoted_col, quote_literal(val)),
                None => format!("{}=NULL", quoted_col)
            }
        }

        fn col_eq_val((col, maybe_val): (&String, &Option<String>)) -> String {
            let quoted_col = quote_ident(col);
            match maybe_val.as_ref() {
                Some(val) => format!("{}={}", quoted_col, quote_literal(val)),
                None => format!("{} IS NULL", quoted_col)
            }
        }

        let (stmt, column_names_by_values_positions) = {
            use std::fmt::Write;

            let mut stmt = String::new();
            stmt.push_str("UPDATE");
            stmt.push(' ');
            write!(stmt, "{schema_name}.{table_name}",
                   schema_name = quote_ident(schema_name),
                   table_name = quote_ident(table_name)).unwrap();
            stmt.push(' ');
            stmt.push_str("SET");
            stmt.push(' ');

            let mut column_names_by_values_positions = BTreeMap::new();
            for (i, (column_name, value_to_set)) in changes.iter().enumerate() {
                if i > 0 {
                    stmt.push(',');
                }
                stmt.push_str(&quote_ident(column_name).to_string());
                stmt.push('=');
                let value_literal_pos = stmt.len() + 1;
                column_names_by_values_positions.insert(value_literal_pos, column_name.clone());
                match *value_to_set {
                    Some(ref val) => stmt.push_str(&quote_literal(val).to_string()),
                    None => stmt.push_str("NULL")
                }
            }

            stmt.push(' ');
            stmt.push_str("WHERE");
            stmt.push(' ');
            for (i, (column_name, key_value)) in key.iter().enumerate() {
                if i > 0 {
                    stmt.push_str(" AND ");
                }
                stmt.push_str(&quote_ident(column_name).to_string());
                match *key_value {
                    Some(ref val) => {
                        stmt.push('=');
                        stmt.push_str(&quote_literal(val).to_string());
                    }
                    None => {
                        stmt.push_str(" IS NULL");
                    }
                }
            }
            stmt.push_str(" RETURNING *");
            (stmt, column_names_by_values_positions)
        };

        // let stmt = format!(
        //     "UPDATE {schema_name}.{table_name} \
        //         SET {assignments} \
        //       WHERE {filter} \
        //   RETURNING *",
        //     schema_name = quote_ident(schema_name),
        //     table_name = quote_ident(table_name),
        //     assignments = changes.iter()
        //                          .map(col_assign_val)
        //                          .collect::<Vec<_>>()
        //                          .connect(","),
        //     filter = key.iter()
        //                 .map(col_eq_val)
        //                 .collect::<Vec<_>>()
        //                 .connect(" AND ")
        // );

        let mut tran = try!(self.begin_transation());

        println!("{}", stmt);
        let stmt_successes = try!(tran.execute(&stmt, /* max_rows: */ 1).map_err(|err| match err {
            ExecutionError::SqlError(sql_err) => {

                let col_name = sql_err.position.and_then(|pos| {
                    column_names_by_values_positions.get(&pos)
                        .map(|it| it.clone())
                });

                let is_invalid_input = match sql_err.code {
                    SqlState::DataException(..)
                    | SqlState::IntegrityConstraintViolation(..)
                    => true,
                    _ => false
                };

                if is_invalid_input || col_name.is_some() {
                    TableModifyError::InvalidInput {
                        message: sql_err.message,
                        column_name: col_name
                    }
                } else {
                    TableModifyError::OtherError(sql_err)
                }
            }
            ExecutionError::IoError(io_err) => TableModifyError::IoError(io_err),
        }));


        let stmt_success = try!(stmt_successes.last().ok_or(io::Error::new(
            io::ErrorKind::Other,
            "Unexpected empty response while row updating."
        )));

        if stmt_success.rows_received == 0 {
            return Err(TableModifyError::RowNotFound);
        }

        if stmt_success.rows_received > 1 {
            return Err(TableModifyError::NotUniqueKey);
        }

        let updated_row = stmt_success.rows.last().unwrap().clone();

        // let commit_result = self.execute_nonquery("COMMIT");
        // if Err(exec_err) = commit_result {
        //     match exec_err {
        //         ExecutionError::SqlError(sql_err) => {
        //             self.execute_nonquery("ROLLBACK");

        //         }
        //     }
        // }


        match tran.commit() {
            Ok(_) => { /* pass */ },
            Err(ExecutionError::SqlError(sql_err)) => {
                return Err(TableModifyError::InvalidInput {
                    message: sql_err.message,
                    column_name: None
                });
            }
            Err(ExecutionError::IoError(io_err)) => {
                return Err(TableModifyError::IoError(io_err));
            }
        };

        let dict = stmt_success.row_description.iter()
                            .map(|field_descr| field_descr.name.clone())
                            .zip(updated_row)
                            .collect::<BTreeMap<_, _>>();

        Ok(dict)
    }

    pub fn delete_row(&mut self,
                      schema_name: &str,
                      table_name: &str,
                      key: BTreeMap<String, Option<String>>)
                      -> Result<(), TableModifyError>
    {
        Ok(())
    }

    // fn execute_nonquery(&mut self, nonquery: &str) -> io::Result<()> {
    //     try!(self.stream.write_query_message(nonquery));
    //     loop {
    //         let mut error_msg = None;

    //         match try!(self.stream.read_message()) {

    //         }
    //     }


    //     let events = try!(self.execute_script("BEGIN"));


    //     match events.next() {
    //         Some(CommandComplete { command_tag: "BEGIN TRANSACTION" }) => {}
    //         Some(unexpected) => panic!("Unexpected message"),
    //         None => panic!("Unexpected end")
    //     }

    //     match events.next() {
    //         Some(ReadyForQuery { transaction_status: InTransaction }) => {}
    //         Some(unexpected) => panic!("Unexpected message"),
    //         None => panic!("Unexpected end")
    //     }

    //     match events.next() {
    //         None => {},
    //         Some(_) => panic!("Unexpected message")
    //     }

    //     Ok(())
    // }

    // pub fn execute_query(&mut self, query: &str) -> io::Result<Vec<Row>> {
    //     self.execute_script(query)
    //         .map(|msg_iter| msg_iter
    //             .filter_map(|msg| match msg {
    //                 ExecutionEvent::RowFetched(row) => Some(row),
    //                 _ => None,
    //             })
    //             .collect::<Vec<Row>>()
    //         )
    // }

    // pub fn query<TRel: Decodable>(&mut self, query: &str) -> io::Result<Vec<TRel>> {
    //     use self::ExecutionEvent::{
    //         RowFetched,
    //         SqlErrorOccured,
    //     };

    //     let mut res = vec![];
    //     for msg_res in try!(self.execute_script(query)) {
    //         match msg_res {
    //             RowFetched(row) => res.push(try!(decoder::decode_row(row).map_err(|decode_err| io::Error::new(
    //                 io::ErrorKind::Other,
    //                 decode_err),
    //             ))),
    //             SqlErrorOccured(err) => return Err(io::Error::new(
    //                 io::ErrorKind::Other,
    //                 "Error response while querying",
    //                 //Some(format!("{:?}", err)),
    //             )),
    //             _ => {},
    //         }
    //     }

    //     Ok(res)

    // }

    pub fn finish(mut self) -> Result<(), Error> {
        self.write_message(TerminateMessage)
    }
}

struct Transaction<'a> {
    conn: &'a mut Connection
}

impl<'a> Transaction<'a> {
    fn begin(conn: &'a mut Connection) -> Result<Transaction, ExecutionError> {
        try!(conn.execute_nonquery("BEGIN"));
        Ok(Transaction { conn: conn })
    }

    fn commit(self) -> Result<(), ExecutionError> {
        try!(self.conn.execute_nonquery("COMMIT"));
        Ok(())
    }

    pub fn execute_nonquery(&mut self, script: &str) -> Result<Vec<StatementSuccess>, ExecutionError> {
        self.conn.execute_nonquery(script)
    }

    pub fn execute(&mut self, script: &str, max_rows: usize) -> Result<Vec<StatementSuccess>, ExecutionError> {
        self.conn.execute(script, max_rows)
    }
}

impl<'a> Drop for Transaction<'a> {
    fn drop(&mut self) {
        if self.conn.transaction_status != TransactionStatus::Idle {
            if let Err(exec_err) = self.conn.execute_nonquery("ROLLBACK") {
                println!("Error while rollback transaction: {:#?}", exec_err);
            }
        }
    }
}

pub struct StatementSuccess {
    is_rowset: bool,
    row_description: Vec<FieldDescription>,
    rows: Vec<Vec<Option<String>>>,
    rows_received: usize,
    rows_ignored: usize,
    notices: Vec<Notice>,
    command_tag: String,
}

#[derive(Debug)]
pub enum ExecutionError {
    IoError(io::Error),
    SqlError(SqlError)
}

impl ::std::convert::From<io::Error> for ExecutionError {
    fn from(io_err: io::Error) -> ExecutionError {
        ExecutionError::IoError(io_err)
    }
}

#[derive(Debug)]
pub enum TableModifyError {
    RowNotFound,
    NotUniqueKey,
    EmptyKey,
    InvalidInput {
        column_name: Option<String>,
        message: String,
    },
    OtherError(SqlError),
    IoError(io::Error),
}

impl ::std::convert::From<io::Error> for TableModifyError {
    fn from(io_err: io::Error) -> TableModifyError {
        TableModifyError::IoError(io_err)
    }
}

impl ::std::convert::From<ExecutionError> for TableModifyError {
    fn from(exec_err: ExecutionError) -> TableModifyError {
        match exec_err {
            ExecutionError::SqlError(e) => TableModifyError::OtherError(e),
            ExecutionError::IoError(e) => TableModifyError::IoError(e),
        }
    }
}

pub struct Cursor {
    conn: Connection,
    result: Option<Result<String, Error>>,
}

impl Cursor {
    fn new(conn: Connection) -> Cursor {
        Cursor {
            conn: conn,
            result: None,
        }
    }

    pub fn complete(mut self) -> Result<(String, Connection), Error> {
        while let Some(_) = self.next() {}

        let Cursor { conn, result } = self;
        result.expect("Cursor finished without result")
              .map(|cmd_tag| (cmd_tag, conn))
    }
}

impl Iterator for Cursor {
    type Item = Vec<Option<String>>;

    fn next(&mut self) -> Option<Self::Item> {

        if self.result.is_some() {
            return None;
        }

        let message = match self.conn.read_message() {
            Ok(message) => message,
            Err(err) => {
                self.result = Some(Err(err));
                return None;
            }
        };

        self.result = Some(match message {
            BackendMessage::DataRow(values) => {
                return Some(values);
            }
            BackendMessage::CommandComplete { command_tag } => {
                self.conn.wait_for_ready().unwrap();
                Ok(command_tag)
            }
            BackendMessage::ErrorResponse(sql_err) => {
                self.conn.wait_for_ready().unwrap();
                Err(Error::SqlError(sql_err))
            }
            unexpected => {
                Err(self.conn.bad_response(&unexpected))
            }
        });

        None
    }
}

// pub struct ExecIter {
//     conn: Connection,

//     is_exhausted: bool,
//     is_in_rowset: bool,
// }

// impl Iterator for ExecIter {
//     type Item = ExecutionEvent;

//     fn next(&mut self) -> Option<ExecutionEvent> {

//     }
// }

// pub struct ExecutionEventIterator<'a> {
//     msg_reader: &'a mut BufStream<InternalStream>,
//     is_exhausted: bool,
//     is_in_rowset: bool,
// }

// impl<'a> ExecutionEventIterator<'a> {
//     fn new(msg_reader: &'a mut BufStream<InternalStream>) -> ExecutionEventIterator<'a> {
//         ExecutionEventIterator {
//             msg_reader: msg_reader,
//             is_exhausted: false,
//             is_in_rowset: false,
//         }
//     }
// }

// impl<'a> Iterator for ExecutionEventIterator<'a> {

//     type Item = ExecutionEvent;

//     fn next(&mut self) -> Option<ExecutionEvent> {

//         if self.is_exhausted {
//             return None;
//         }

//         let message = match self.msg_reader.read_message() {
//             Ok(message) => message,
//             Err(err) => return Some(ExecutionEvent::IoErrorOccured(format!("{:?}", err))),
//         };

//         Some(match message {

//             BackendMessage::ReadyForQuery { .. } => {
//                 self.is_exhausted = true;
//                 return None;
//             }

//             BackendMessage::RowDescription(descr) => {
//                 self.is_in_rowset = true;
//                 ExecutionEvent::RowsetBegin(descr)
//             }

//             BackendMessage::ErrorResponse(e) => {
//                 ExecutionEvent::SqlErrorOccured(e)
//             }

//             BackendMessage::NoticeResponse(n) => {
//                 ExecutionEvent::Notice(n)
//             }

//             BackendMessage::DataRow(row) => {
//                 ExecutionEvent::RowFetched(row)
//             }

//             BackendMessage::CommandComplete { command_tag } => {
//                 if self.is_in_rowset {
//                     self.is_in_rowset = false;
//                     ExecutionEvent::RowsetEnd {
//                         is_explain: command_tag == "EXPLAIN"
//                     }
//                 } else {
//                     ExecutionEvent::NonQueryExecuted(command_tag)
//                 }
//             }

//             unexpected => ExecutionEvent::IoErrorOccured(//io::Error::new(
//                 //io::ErrorKind::Other,
//                 "Unexpected message received.".to_string(),
//                 // Some(format!("Got {:?}", unexpected)),
//             ),

//         })
//     }
// }




fn main() {
    use std::io::{ self, BufRead };

    let mut conn = connect("localhost:5432",
                           "test",
                           "postgres",
                           "postgres").unwrap();

    conn.parse_statement("s", "select *, case when i % 2 = 0 then r('even') end from generate_series(0, 5) as i").unwrap();
    let descr = conn.describe_statement("s").unwrap();
    let mut cursor = conn.execute_statement("s", &[]).unwrap();
    let data = cursor.by_ref().collect::<Vec<_>>();
    let (cmd_tag, mut conn) = cursor.complete().unwrap();
    println!("{:#?}", descr);
    println!("{:#?}", data);
    println!("{:#?}", conn.take_notices());
    unreachable!();


    let mut stream = conn.stream;

    let stdin = io::stdin();
    for line_result in stdin.lock().lines() {
        let line = line_result.unwrap();
        if let [message_name, args..] = &line.split('\t').collect::<Vec<_>>()[..] {
            // match message_name {
            //     "query" => stream.write_query_message(args[0]),
            //     "sync" => stream.write_sync_message(),
            //     "parse" => stream.write_parse_message(args[0], args[1]),
            //     "describe_stmt" => stream.write_describe_stmt_message(args[0]),
            //     "bind" => stream.write_bind_message(args[0], args[1]),
            //     "execute" => stream.write_execute_message(args[0], args[1].parse().unwrap()),
            //     "flush" => stream.write_flush_message(),
            //     _ => {
            //         println!("unknown frontent message");
            //         continue;
            //     }
            // }.unwrap();

            while let Ok(backend_msg) = stream.read_message() {
                // println!("-> {:#?}", backend_msg);
            }
        }

        println!("ready for input");
    }
}



#[cfg(test)]
mod test {
    use super::*;


    // fn test_update() {
    //     let mut conn = connect("localhost:5432",
    //                            "postgres",
    //                            "pgblackboard_test_user",
    //                            "pgblackboard_test_pwd").unwrap();

    //     let table_conn = conn.table("public", "foo").unwrap();
    //     let (conn, table.insert()
    // }

    // #[test]
    // fn test_query() {
    //     let mut conn = connect("localhost:5432",
    //                            "postgres",
    //                            "pgblackboard_test_user",
    //                            "pgblackboard_test_pwd").unwrap();

    //     #[derive(RustcDecodable, PartialEq, Debug)]
    //     struct Foo {
    //         id: i32,
    //         name: String,
    //     }

    //     let items = conn.query::<Foo>("select 1, 'one'").unwrap();
    //     assert_eq!(items, vec![
    //         Foo { id: 1, name: "one".to_string() }
    //     ]);
    // }

    // #[test]
    // fn test_script() {
    //     let mut conn = connect("localhost:5432",
    //                            "postgres",
    //                            "pgblackboard_test_user",
    //                            "pgblackboard_test_pwd").unwrap();

    //     #[derive(RustcDecodable, PartialEq, Debug)]
    //     struct Foo {
    //         id: i32,
    //         name: String,
    //     }

    //     let events = conn.execute_script("select 1 as id, 'one' as name")
    //                     .unwrap()
    //                     .collect::<Vec<_>>();

    //     assert_eq!(events, vec![
    //         ExecutionEvent::RowsetBegin(vec![
    //             FieldDescription {
    //                 name: "id".to_string(),
    //                 table_oid: None,
    //                 column_id: None,
    //                 typ: DataType {
    //                     oid: 23,
    //                     size: DataTypeSize::Fixed(4),
    //                     modifier: -1,
    //                 },
    //                 format: FieldFormat::Text
    //             },
    //             FieldDescription {
    //                 name: "name".to_string(),
    //                 table_oid: None,
    //                 column_id: None,
    //                 typ: DataType {
    //                     oid: 705,
    //                     size: DataTypeSize::Variable,
    //                     modifier: -1,
    //                 },
    //                 format: FieldFormat::Text
    //             },
    //         ]),
    //         ExecutionEvent::RowFetched(vec![Some("1".to_string()), Some("one".to_string())]),
    //         ExecutionEvent::RowsetEnd { is_explain: false },
    //     ]);
    // }
}


