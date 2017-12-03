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
    CancelRequestMessage,
};

use std::io::{ self, Read, Write };
use std::net::{ TcpStream, ToSocketAddrs };
use std::collections::VecDeque;



pub type Error = PgErrorOrNotice;
type InternalStream = TcpStream;
pub type Result<T> = ::std::result::Result<T, PgErrorOrNotice>;

pub struct Connection {
    database: String,
    stream: InternalStream,
    transaction_status: TransactionStatus,
    notices: VecDeque<PgErrorOrNotice>,
    is_desynchronized: bool,
    current_execution_result: Option<Result<String>>,
    is_executing: bool,
    process_id: u32,
    secret_key: u32,
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
            process_id: 0,
            secret_key: 0,
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
                    //hasher.input(password.as_bytes());
                    //hasher.input(user.as_bytes());
                    let pwduser_hash = password; // hasher.result_str();
                    //hasher.reset();
                    hasher.input(pwduser_hash.as_bytes());
                    hasher.input(&salt);
                    let output = format!("md5{}", hasher.result_str());
                    conn.write_message(PasswordMessage { password: &output })?;
                    password_was_requested = true;
                }

                BackendMessage::AuthenticationCleartextPassword
                | BackendMessage::AuthenticationSSPI
                | BackendMessage::AuthenticationSCMCredential
                | BackendMessage::AuthenticationGSS => return Err(
                    Error::from(io::Error::new(
                        io::ErrorKind::Other,
                        "Unsupported authentication method.",
                    ))
                ),

                BackendMessage::AuthenticationOk => {
                    // if !password_was_requested {
                    //     return Err(ConnectionError::NoPasswordRequested);
                    // }
                }

                BackendMessage::ErrorResponse(e) => return Err(e),

                BackendMessage::BackendKeyData {
                    process_id,
                    secret_key
                } => {
                    conn.process_id = process_id;
                    conn.secret_key = secret_key;
                }

                BackendMessage::ParameterStatus { .. } => {}

                BackendMessage::ReadyForQuery { .. } => break,

                ref unexpected => return Err(conn.bad_response(unexpected)),
            }
        }

        Ok(conn)
    }

    fn wait_for_ready(&mut self) -> Result<()> {
        // println!("(pid{}) waiting for ready", self.process_id);
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
            let message = backend::read_message(&mut self.stream)
                .unwrap_or_else(|err| BackendMessage::ErrorResponse(
                    PgErrorOrNotice::from(err)));

            if cfg!(debug_assertions) {
                if let BackendMessage::DataRow(ref row) = message {
                    println!("(pid{})-> DataRow [{}]",
                        self.process_id,
                        row.iter()
                            .map(|maybe_val| maybe_val.as_ref()
                                .map(|val| format!("{:?}, ", val))
                                .unwrap_or("null, ".to_owned()))
                            .collect::<String>()
                    );
                } else {
                    println!("(pid{})-> {:?}", self.process_id, message);
                }
            }

            match message {
                BackendMessage::NotificationResponse { .. } => {

                }
                BackendMessage::NoticeResponse(notice) => {
                    self.notices.push_back(notice);
                }
                BackendMessage::ParameterStatus { .. } => {

                }
                BackendMessage::ErrorResponse(sql_err) => {
                    self.is_desynchronized = true;
                    return Err(sql_err);
                }
                other => return Ok(other)
            }
        }
    }

    fn write_message<T: FrontendMessage>(&mut self, msg: T) -> Result<()> {
        if self.is_desynchronized {
            return Err(PgErrorOrNotice {
                severity: "ERROR".to_owned(),
                code: SqlState::IoError,
                message: "writing to desyncronized connection".to_owned(),
                detail: None,
                hint: None,
                position: None,
                internal_position: None,
                internal_query: None,
                where_: None,
                file: None,
                line: None,
                routine: None,
                schema_name: None,
                table_name: None,
                column_name: None,
                datatype_name: None,
                constraint_name: None,
            });
        }
        if cfg!(debug_assertions) {
            println!("(pid{})<- {:?}", self.process_id, &msg);
        }
        frontend::write_message(&mut self.stream, msg).map_err(|err| {
            self.is_desynchronized = true;
            Error::from(err)
        })
    }

    fn bad_response(&mut self, msg: &BackendMessage) -> Error {
        self.is_desynchronized = true;
        Error::from(io::Error::new(
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
                Err(sql_err)
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
                return Err(sql_err)
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
                Err(sql_err)
            }
            ref unexpected => Err(self.bad_response(unexpected))
        }
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
                Err(err)
            }
            ref unexpected => Err(self.bad_response(unexpected))
        }
    }

    pub fn execute_statement(
        &mut self,
        stmt_name: &str,
        rowlimit: u32,
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
            rowlimit: rowlimit,
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
                Err(err)
            }
            ref unexpected => Err(self.bad_response(unexpected))
        }
    }

    pub fn fetch_row(&mut self) -> Option<Row> {
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
                self.wait_for_ready().and(Ok("EMPTY QUERY".to_owned()))
            }
            BackendMessage::PortalSuspended => {
                self.wait_for_ready().and(Ok("SUSPENDED".to_owned()))
            }
            ref unexpected => Err(self.bad_response(&unexpected))
        });

        self.is_executing = false;
        None
    }

    pub fn get_last_execution_result(&self) -> &Option<Result<String>> {
        &self.current_execution_result
    }

    pub fn close(mut self) -> Result<()> {
        use std::net::Shutdown::Both;
        self.is_desynchronized = false;
        self.write_message(TerminateMessage)?;
        self.stream.shutdown(Both)?;
        Ok(())
    }

    pub fn get_process_id(&self) -> u32 { self.process_id }
    pub fn get_secret_key(&self) -> u32 { self.secret_key }
}

pub fn cancel(addr: &str, process_id: u32, secret_key: u32) -> io::Result<()> {
    use std::net::Shutdown::Both;
    let mut stream = InternalStream::connect(addr)?;
    frontend::write_message(&mut stream, CancelRequestMessage {
        secret_key,
        process_id,
    })?;
    stream.shutdown(Both)?;
    Ok(())
}

pub fn query(conn: &mut Connection, stmt: &str) -> Result<Vec<Vec<Option<String>>>> {
    let stmt_name = "pgbb_stmt";
    conn.parse_statement(stmt_name, stmt)?;
    conn.execute_statement(stmt_name, 0 , &[])?;
    let mut rows = vec![];
    while let Some(row) = conn.fetch_row() {
        rows.push(row);
    }
    let result = conn.current_execution_result
                     .take()
                     .unwrap_or(Ok("".to_owned()))
                     .map(|_| rows);
    conn.close_statement(stmt_name)?;
    result
}
