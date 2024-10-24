mod md5;
mod sqlstate;
mod backend;
mod frontend;

use self::md5::Md5;

pub use self::sqlstate::{
    SqlState,
    SqlStateClass,
};

pub use self::backend::{
    PgErrorOrNotice,
    Oid,
    FieldDescription,
    TransactionStatus,
};

use self::backend::{
    BackendMessage,
    Row,
};

use self::frontend::{
    FrontendMessage,
    StartupMessage,
    PasswordMessage,
    ParseMessage,
    BindMessage,
    ExecuteMessage,
    DescribeStatementMessage,
    CloseStatementMessage,
    TerminateMessage,
    FlushMessage,
    SyncMessage,
};

use std::io::{ self, Read, Write };
use std::net::{ TcpStream, ToSocketAddrs };
use std::collections::VecDeque;


#[derive(Debug)]
pub enum Error {
    SqlError(PgErrorOrNotice),
    IoError(io::Error),
    OtherError(Box<::std::error::Error>),
}

impl ::std::error::Error for Error {
    fn description(&self) -> &str {
        match *self {
            Error::SqlError(ref err) => &err.message,
            Error::IoError(ref err) => err.description(),
            Error::OtherError(ref err) => err.description(),
        }
    }
}

impl ::std::fmt::Display for Error {
    fn fmt(&self, f: &mut ::std::fmt::Formatter) -> ::std::fmt::Result {
        write!(f, "{:#?}", self)
    }
}

impl ::std::convert::From<io::Error> for Error {
    fn from(err: io::Error) -> Error {
        Error::IoError(err)
    }
}

type InternalStream = TcpStream;
pub type Result<T> = ::std::result::Result<T, Error>;

pub struct Connection {
    database: String,
    stream: InternalStream,
    transaction_status: TransactionStatus,
    notices: VecDeque<PgErrorOrNotice>,
    is_desynchronized: bool,
    current_execution_result: Option<Result<String>>,
    is_executing: bool,
}

pub fn connect<T>(
    addr: T,
    database: &str,
    credentials: (&str, &str))
    -> Result<Connection>
    where T: ToSocketAddrs
{
    // use std::time::Duration;
    let stream = try!(InternalStream::connect(addr));
    // stream.set_read_timeout(Some(Duration::new(1, 0)));

    Connection::startup(
        stream,
        database,
        credentials.0,
        credentials.1,
    )
}

impl Connection {

    fn startup(
        stream: InternalStream,
        database: &str,
        user: &str,
        password: &str)
        -> Result<Connection>
    {
        let mut conn = Connection {
            database: database.to_string(),
            stream: stream,
            transaction_status: TransactionStatus::Idle,
            notices: VecDeque::new(),
            is_desynchronized: false,
            current_execution_result: None,
            is_executing: false,
        };

        try!(conn.write_message(StartupMessage {
            user: user,
            database: database,
        }));

        let mut password_was_requested = false;
        loop {
            match try!(conn.read_message()) {

                BackendMessage::AuthenticationMD5Password { salt } => {
                    let mut hasher = Md5::new();
                    hasher.input(password.as_bytes());
                    hasher.input(user.as_bytes());
                    let pwduser_hash = hasher.result_str();
                    hasher.reset();
                    hasher.input(pwduser_hash.as_bytes());
                    hasher.input(&salt);
                    let output = format!("md5{}", hasher.result_str());
                    try!(conn.write_message(PasswordMessage { password: &output }));
                    password_was_requested = true;
                }

                BackendMessage::AuthenticationCleartextPassword => {
                     try!(conn.write_message(PasswordMessage { password: password }));
                    password_was_requested = true;
                }

                BackendMessage::AuthenticationSSPI
                | BackendMessage::AuthenticationSCMCredential
                | BackendMessage::AuthenticationGSS => return Err(
                    Error::IoError(io::Error::new(
                        io::ErrorKind::Other,
                        "Unsupported authentication method.",
                    ))
                ),

                BackendMessage::AuthenticationOk => {
                    // if !password_was_requested {
                    //     return Err(ConnectionError::NoPasswordRequested);
                    // }
                }

                BackendMessage::ErrorResponse(e) => return Err(
                    Error::SqlError(e)
                ),

                BackendMessage::BackendKeyData { .. } => {}

                BackendMessage::ParameterStatus { .. } => {}

                BackendMessage::ReadyForQuery { .. } => break,

                ref unexpected => return Err(conn.bad_response(unexpected)),
            }
        }

        Ok(conn)
    }

    fn wait_for_ready(&mut self) -> Result<()> {
        match try!(self.read_message()) {
            BackendMessage::ReadyForQuery { transaction_status } => {
                self.transaction_status = transaction_status;
                Ok(())
            },
            ref unexpected => Err(self.bad_response(unexpected))
        }
    }

    fn read_message(&mut self) -> Result<BackendMessage> {
        loop {
            let message = match backend::read_message(&mut self.stream) {
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
                    self.notices.push_back(notice);
                }
                BackendMessage::ParameterStatus { .. } => {

                }
                other => return Ok(other)
            }
        }
    }

    fn write_message<T: FrontendMessage>(&mut self, msg: T) -> Result<()> {
        frontend::write_message(&mut self.stream, msg).map_err(|err| {
            self.is_desynchronized = true;
            Error::IoError(err)
        })
    }

    fn bad_response(&mut self, msg: &BackendMessage) -> Error {
        self.is_desynchronized = true;
        Error::IoError(io::Error::new(
            io::ErrorKind::Other,
            format!("Unexpected message from postgres: {:#?}", msg)
        ))
    }

    pub fn database(&self) -> &str {
        &self.database
    }

    pub fn pop_notice(&mut self) -> Option<PgErrorOrNotice> {
        self.notices.pop_front()
    }

    pub fn parse_statement(
        &mut self,
        stmt_name: &str,
        stmt_body: &str)
        -> Result<()>
    {

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

    pub fn describe_statement(
        &mut self,
        stmt_name: &str)
        -> Result<Vec<FieldDescription>>
    {
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

    pub fn execute_statement(
        mut self,
        stmt_name: &str,
        params: &[Option<&str>])
        -> Cursor
    {
        if let Err(err) = self.begin_execute_statement(stmt_name, 0, params) {
            self.current_execution_result = Some(Err(err));
        }
        Cursor { conn: self }
    }

    pub fn close_statement(
        &mut self,
        stmt_name: &str)
        -> Result<()>
    {
        try!(self.write_message(CloseStatementMessage {
            stmt_name: stmt_name,
        }));

        try!(self.write_message(SyncMessage));

        match try!(self.read_message()) {
            BackendMessage::CloseComplete => {
                try!(self.wait_for_ready());
                Ok(())
            }
            BackendMessage::ErrorResponse(err) => {
                try!(self.wait_for_ready());
                Err(Error::SqlError(err))
            }
            ref unexpected => Err(self.bad_response(unexpected))
        }
    }

    pub fn execute_statement_into_vec(
        &mut self,
        stmt_name: &str,
        row_limit: u32,
        params: &[Option<&str>])
        -> Result<(Vec<Row>, String)>
    {
        try!(self.begin_execute_statement(stmt_name, row_limit, params));
        let mut rows = vec![];
        while let Some(row) = self.fetch_row() {
            rows.push(row);
        }
        self.current_execution_result
            .take()
            .expect("All rows was fetched without result.")
            .map(|cmdtag| (rows, cmdtag.to_string()))
    }

    fn begin_execute_statement(
        &mut self,
        stmt_name: &str,
        row_limit: u32,
        params: &[Option<&str>])
        -> Result<()>
    {
        self.current_execution_result = None;

        let bind_message = BindMessage {
            stmt_name: stmt_name,
            portal_name: "",
            params: params
        };

        let execute_message = ExecuteMessage {
            portal_name: "",
            row_limit: row_limit,
        };

        let response = self.write_message(bind_message)
            .and_then(|_| self.write_message(execute_message))
            .and_then(|_| self.write_message(SyncMessage))
            .and_then(|_| self.read_message());

        match try!(response) {
            BackendMessage::BindComplete => {
                self.is_executing = true;
                Ok(())
            },
            BackendMessage::ErrorResponse(err) => {
                try!(self.wait_for_ready());
                Err(Error::SqlError(err))
            }
            ref unexpected => Err(self.bad_response(unexpected))
        }
    }

    fn fetch_row(&mut self) -> Option<Row> {
        if !self.is_executing {
            return None
        }

        let message = match self.read_message() {
            Ok(message) => message,
            Err(err) => {
                self.current_execution_result = Some(Err(err));
                return None;
            }
        };

        self.current_execution_result = Some(match message {
            BackendMessage::DataRow(values) => return Some(values),
            BackendMessage::CommandComplete { command_tag } => {
                self.wait_for_ready().and(Ok(command_tag))
            }
            BackendMessage::EmptyQueryResponse => {
                self.wait_for_ready().and(Ok("".to_string()))
            }
            BackendMessage::ErrorResponse(sql_err) => {
                self.wait_for_ready().and(Err(Error::SqlError(sql_err)))
            }
            BackendMessage::PortalSuspended => {
                self.wait_for_ready().and(Ok("".to_string()))
            }
            ref unexpected => Err(self.bad_response(&unexpected))
        });

        self.is_executing = false;
        None
    }

    // pub fn begin_transation(&mut self) -> Result<Transaction> {
    //     Transaction::begin(self)
    // }

    pub fn close(mut self) -> Result<()> {
        self.write_message(TerminateMessage)
    }
}

// pub struct Transaction<'conn> {
//     conn: &'conn mut Connection
// }
//
// impl<'conn> Transaction<'conn> {
//     fn begin(conn: &'conn mut Connection) -> Result<Transaction> {
//         conn.parse_statement("", "BEGIN")
//             .and_then(|_| conn.execute_statement("", &[]).complete())
//             .map(move |_| Transaction { conn: conn })
//     }
//
//     pub fn commit(self) -> Result<()> {
//         self.conn.parse_statement("", "COMMIT")
//             .and_then(|_| self.conn.execute_statement("", &[]).complete())
//             .map(|_| ())
//     }
// }
//
// impl<'conn> Drop for Transaction<'conn> {
//     fn drop(&mut self) {
//         if self.conn.transaction_status != TransactionStatus::Idle {
//             let rollback_result = self.conn.parse_statement("", "ROLLBACK")
//                     .and_then(|_| self.conn.execute_statement("", &[]).complete());
//
//             if let Err(rollback_err) = rollback_result {
//                 println!("Error while rollback transaction: {:#?}", rollback_err);
//             }
//         }
//     }
// }

pub struct Cursor {
    conn: Connection,
}

impl Cursor {
    pub fn complete(mut self) -> Result<(String, Connection)> {
        while let Some(_) = self.next() {}
        let Cursor { mut conn } = self;
        conn.current_execution_result
            .take()
            .expect("Cursor has no result.")
            .map(|cmd_tag| (cmd_tag.to_string(), conn))
    }
}

impl Iterator for Cursor {
    type Item = Row;
    fn next(&mut self) -> Option<Self::Item> { self.conn.fetch_row() }
}
