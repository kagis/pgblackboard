#![feature(read_exact)]
#![feature(slice_patterns)]

mod md5;
mod sqlstate;
mod backend;
mod frontend;

use self::md5::Md5;

pub use self::sqlstate::{
    SqlState,
    SqlStateClass,
};

use self::backend::{
    BackendMessage,
    FieldDescription,
    SqlError,
    Notice,
    ErrorOrNotice,
    TransactionStatus,
    Row,
    Oid,
};

use self::frontend::{
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

use std::mem;
use std::io::{ self, Read, Write };
use std::net::{ TcpStream, ToSocketAddrs };


struct MessageStream<S: Read + Write> {
    inner: S
}

impl<S: Read + Write> MessageStream<S> {
    pub fn new(inner: S) -> MessageStream<S> {
        MessageStream { inner: inner }
    }
}

impl<S: Read + Write> MessageStream<S> {
    pub fn read_message(&mut self) -> io::Result<BackendMessage> {
        backend::read_message(&mut self.inner)
    }

    pub fn write_message<M: FrontendMessage>(&mut self, msg: M) -> io::Result<()> {
        frontend::write_message(&mut self.inner, msg)
    }
}

#[derive(Debug)]
pub enum Error {
    SqlError(SqlError),
    IoError(io::Error)
}


type InternalStream = TcpStream;


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

impl ::std::convert::From<io::Error> for Error {
    fn from(err: io::Error) -> Error {
        Error::IoError(err)
    }
}

pub struct Connection {
    stream: MessageStream<InternalStream>,
    transaction_status: TransactionStatus,
    notices: Vec<Notice>,
    is_desynchronized: bool,
}

pub fn connect<T>(
    addr: T,
    database: &str,
    user: &str,
    password: &str)
    -> Result<Connection, Error>
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

impl Connection {

    fn connect_database(
        stream: InternalStream,
        database: &str,
        user: &str,
        password: &str)
        -> Result<Connection, Error>
    {

        let mut stream = MessageStream::new(stream);

        try!(stream.write_message(StartupMessage {
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

                ref unexpected => return Err(Error::IoError(io::Error::new(
                    io::ErrorKind::Other,
                    "Unexpected message while startup.",
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

    pub fn parse_statement(
        &mut self,
        stmt_name: &str,
        stmt_body: &str)
        -> Result<(), Error>
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
        -> Result<Vec<FieldDescription>, Error>
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
        let bind_message = BindMessage {
            stmt_name: stmt_name,
            portal_name: "",
            params: params
        };

        let execute_message = ExecuteMessage {
            portal_name: "",
            row_limit: 0
        };

        let response = self.write_message(bind_message)
            .and_then(|_| self.write_message(execute_message))
            .and_then(|_| self.write_message(SyncMessage))
            .and_then(|_| self.read_message());

        let response_message = match response {
            Ok(message) => message,
            Err(err) => return Cursor::new_err(err, self)
        };

        match response_message {
            BackendMessage::BindComplete => Cursor::new(self),
            BackendMessage::ErrorResponse(err) => {
                match self.wait_for_ready() {
                    Ok(()) => {},
                    Err(err) => return Cursor::new_err(err, self),
                };
                Cursor::new_err(Error::SqlError(err), self)
            }
            unexpected => Cursor::new_err(self.bad_response(&unexpected), self)
        }
    }

    // pub fn begin_transation(&mut self) -> Result<Transaction, Error> {
    //     Transaction::begin(self)
    // }

    pub fn close(mut self) -> Result<(), Error> {
        self.write_message(TerminateMessage)
    }
}

// pub struct Transaction<'conn> {
//     conn: &'conn mut Connection
// }
//
// impl<'conn> Transaction<'conn> {
//     fn begin(conn: &'conn mut Connection) -> Result<Transaction, Error> {
//         conn.parse_statement("", "BEGIN")
//             .and_then(|_| conn.execute_statement("", &[]).complete())
//             .map(move |_| Transaction { conn: conn })
//     }
//
//     pub fn commit(self) -> Result<(), Error> {
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
    result: Option<Result<String, Error>>,
}

impl Cursor {
    fn new(conn: Connection) -> Cursor {
        Cursor {
            conn: conn,
            result: None,
        }
    }

    fn new_err(err: Error, conn: Connection) -> Cursor {
        Cursor {
            conn: conn,
            result: Some(Err(err)),
        }
    }

    pub fn complete(mut self) -> Result<(String, Connection), Error> {
        while let Some(_) = self.next() {}
        let Cursor { conn, result } = self;
        result.expect("Cursor has no result.")
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
            BackendMessage::EmptyQueryResponse => {
                self.conn.wait_for_ready().unwrap();
                Ok("".to_string())
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

// fn main() {
//     use std::io::{ self, BufRead };

//     let mut conn = connect("localhost:5432",
//                            "test",
//                            "postgres",
//                            "postgres").unwrap();

//     conn.parse_statement("s", "select *, case when i % 2 = 0 then r('even') end from generate_series(0, 5) as i").unwrap();
//     let descr = conn.describe_statement("s").unwrap();
//     let (data, cmd_tag) = {
//         let mut cursor = conn.execute_statement("s", &[]);
//         (cursor.by_ref().collect::<Vec<_>>(), cursor.complete().unwrap())
//     };

//     println!("{:#?}", descr);
//     println!("{:#?}", data);
//     println!("{:#?}", conn.take_notices());
//     unreachable!();


//     let mut stream = conn.stream;

//     let stdin = io::stdin();
//     for line_result in stdin.lock().lines() {
//         let line = line_result.unwrap();
//         if let [message_name, args..] = &line.split('\t').collect::<Vec<_>>()[..] {
//             // match message_name {
//             //     "query" => stream.write_query_message(args[0]),
//             //     "sync" => stream.write_sync_message(),
//             //     "parse" => stream.write_parse_message(args[0], args[1]),
//             //     "describe_stmt" => stream.write_describe_stmt_message(args[0]),
//             //     "bind" => stream.write_bind_message(args[0], args[1]),
//             //     "execute" => stream.write_execute_message(args[0], args[1].parse().unwrap()),
//             //     "flush" => stream.write_flush_message(),
//             //     _ => {
//             //         println!("unknown frontend message");
//             //         continue;
//             //     }
//             // }.unwrap();

//             while let Ok(backend_msg) = stream.read_message() {
//                 // println!("-> {:#?}", backend_msg);
//             }
//         }

//         println!("ready for input");
//     }
// }



#[cfg(test)]
mod test {
    use super::*;

}
