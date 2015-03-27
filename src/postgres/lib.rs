//extern crate crypto;
extern crate byteorder;

//use self::crypto::Md5;

use byteorder::{BigEndian, ReadBytesExt, WriteBytesExt};
use std::io::{self, Read, Write, BufRead, BufStream};
use std::net::{TcpStream, ToSocketAddrs};
use std::mem;
use std::char;
use std::i32;

pub use self::sqlstate::SqlState;

use self::cstr::{CStringWriter, CStringReader, cstr_len};

mod sqlstate;
//mod decoder;
mod cstr;



pub type Oid = u32;


#[derive(Debug)]
pub enum FieldTypeSize {
    Fixed(usize),
    Variable,
}


#[derive(Debug)]
pub enum FieldFormat {
    Text,
    Binary,
}


#[derive(Debug)]
pub struct FieldDescription {

    /// The field name.
    pub name: String,

    /// If the field can be identified as a column of a specific table,
    /// the object ID of the table; otherwise zero.
    pub table_oid: Option<Oid>,

    /// If the field can be identified as a column of a specific table,
    /// the attribute number of the column; otherwise zero.
    pub column_id: Option<i16>,

    /// The object ID of the field's data type.
    pub type_oid: Oid,

    /// The data type size (see pg_type.typlen).
    /// Note that negative values denote variable-width types.
    pub type_size: FieldTypeSize,

    /// The type modifier (see pg_attribute.atttypmod).
    /// The meaning of the modifier is type-specific.
    pub type_modifier: i32,

    /// The format code being used for the field.
    /// Currently will be zero (text) or one (binary).
    /// In a RowDescription returned from the statement variant of Describe,
    /// the format code is not yet known and will always be zero.
    pub format: FieldFormat,
}


#[derive(Debug)]
enum ConnectionStatus {
    Idle,
    InTransaction,
    InFailedTransaction,
}


#[derive(Debug)]
pub struct ErrorOrNotice {

    // S
    /// The field contents are ERROR, FATAL, or PANIC (in an error message),
    /// or WARNING, NOTICE, DEBUG, INFO, or LOG (in a notice message), or a
    /// localized translation of one of these. Always present.
    pub severity: String,

    // C
    /// The SQLSTATE code for the error (see Appendix A). Not localizable.
    /// Always present.
    pub code: SqlState,

    // M
    /// The primary human-readable error message. This should be accurate
    /// but terse (typically one line). Always present.
    pub message: String,

    // D
    /// An optional secondary error message carrying more detail about
    /// the problem. Might run to multiple lines.
    pub detail: Option<String>,

    // H
    /// An optional suggestion what to do about the problem.
    /// This is intended to differ from Detail in that it offers advice
    /// (potentially inappropriate) rather than hard facts.
    /// Might run to multiple lines.
    pub hint: Option<String>,

    // P
    /// The field value is a decimal ASCII integer, indicating an error cursor
    /// position as an index into the original query string.
    /// The first character has index 1,
    /// and positions are measured in characters not bytes.
    pub position: Option<usize>,

    // p
    /// This is defined the same as the P field, but it is used when the cursor
    /// position refers to an internally generated command rather than the one
    /// submitted by the client. The q field will always appear when this
    /// field appears.
    pub internal_position: Option<usize>,

    // q
    /// The text of a failed internally-generated command. This could be,
    /// for example, a SQL query issued by a PL/pgSQL function.
    pub internal_query: Option<String>,

    // W
    /// An indication of the context in which the error occurred.
    /// Presently this includes a call stack traceback of active procedural
    /// language functions and internally-generated queries. The trace is
    /// one entry per line, most recent first.
    pub where_: Option<String>,

    // F
    /// The file name of the source-code location
    /// where the error was reported.
    pub file: Option<String>,

    // L
    /// The line number of the source-code location
    /// where the error was reported.
    pub line: Option<usize>,

    // R
    /// The name of the source-code routine reporting the error.
    pub routine: Option<String>,
}

#[derive(Debug)]
pub enum BackendMessage {

    /// Specifies that the authentication was successful.
    AuthenticationOk,

    /// Specifies that a clear-text password is required.
    AuthenticationCleartextPassword,

    /// Specifies that GSSAPI authentication is required.
    AuthenticationGSS,

    /// Specifies that Kerberos V5 authentication is required.
    AuthenticationKerberosV5,

    /// Specifies that an MD5-encrypted password is required.
    AuthenticationMD5Password {

        /// The salt to use when encrypting the password.
        salt: [u8; 4]
    },

    /// Specifies that an SCM credentials message is required.
    AuthenticationSCMCredential,

    /// Specifies that SSPI authentication is required.
    AuthenticationSSPI,

    /// Byte1('K') Identifies the message as cancellation key data.
    /// The frontend must save these values if it wishes
    /// to be able to issue CancelRequest messages later.
    BackendKeyData {

        /// The process ID of this backend.
        process_id: u32,

        /// The secret key of this backend.
        secret_key: u32
    },

    //BindComplete,

    //CloseComplete,

    /// Byte1('C') Identifies the message as a command-completed response.
    CommandComplete {

        /// The command tag. This is usually a single word that identifies
        /// which SQL command was completed.
        /// For an INSERT command, the tag is INSERT oid rows, where rows is
        /// the number of rows inserted. oid is the object ID of the inserted
        /// row if rows is 1 and the target table has OIDs; otherwise oid is 0.
        /// For a DELETE command, the tag is DELETE rows
        /// where rows is the number of rows deleted.
        /// For an UPDATE command, the tag is UPDATE rows
        /// where rows is the number of rows updated.
        /// For a SELECT or CREATE TABLE AS command, the tag is SELECT rows
        /// where rows is the number of rows retrieved.
        /// For a MOVE command, the tag is MOVE rows
        /// where rows is the number of rows the cursor's
        /// position has been changed by.
        /// For a FETCH command, the tag is FETCH rows
        /// where rows is the number of rows that have been retrieved
        /// from the cursor.
        /// For a COPY command, the tag is COPY rows
        /// where rows is the number of rows copied.
        /// (Note: the row count appears only in PostgreSQL 8.2 and later.)
        command_tag: String
    },

    /// Byte1('G') Identifies the message as a Start Copy In response.
    /// The frontend must now send copy-in data
    /// (if not prepared to do so, send a CopyFail message).
    CopyInResponse {

        /// 0 indicates the overall COPY format is textual (rows separated
        /// by newlines, columns separated by separator characters, etc).
        /// 1 indicates the overall copy format is binary (similar to DataRow
        /// format). See COPY for more information.
        format: u8,

        /// The format codes to be used for each column.
        /// Each must presently be zero (text) or one (binary).
        /// All must be zero if the overall copy format is textual.
        column_formats: Vec<u16>,
    },

    /// Byte1('D') Identifies the message as a data row.
    DataRow(Vec<Option<String>>),

    /// Identifies the message as a response to an empty query string.
    /// (This substitutes for CommandComplete.)
    EmptyQueryResponse,

    /// Byte1('E') Identifies the message as an error.
    ErrorResponse(ErrorOrNotice),

    /// Identifies the message as a no-data indicator.
    NoData,

    /// Byte1('N') Identifies the message as a notice.
    NoticeResponse(ErrorOrNotice),

    /// Byte1('A') Identifies the message as a notification response.
    NotificationResponse {

        /// The process ID of the notifying backend process.
        pid: u32,

        /// The name of the channel that the notify has been raised on.
        channel: String,

        /// The "payload" string passed from the notifying process.
        payload: String,
    },

    /// Byte1('S') Identifies the message as a run-time parameter status report.
    ParameterStatus {

        /// The name of the run-time parameter being reported.
        parameter: String,

        /// The current value of the parameter.
        value: String,
    },

    //ParseComplete,

    //PortalSuspended,

    /// Byte1('Z'). ReadyForQuery is sent whenever the backend
    /// is ready for a new query cycle.
    ReadyForQuery {

        /// Current backend transaction status indicator.
        /// Possible values are 'I' if idle (not in a transaction block);
        /// 'T' if in a transaction block; or 'E' if in a failed transaction
        /// block (queries will be rejected until block is ended).
        connection_status: ConnectionStatus
    },

    /// Byte1('T') Identifies the message as a row description.
    RowDescription(Vec<FieldDescription>),
}

trait MessageReader {
    fn read_message(&mut self) -> io::Result<BackendMessage>;
}

impl<T: BufRead> MessageReader for T  {
    fn read_message(&mut self) -> io::Result<BackendMessage> {
        let ident = try!(self.read_u8());
        let msg_len_including_self = try!(self.read_i32::<BigEndian>());
        let msg_len = msg_len_including_self as usize - mem::size_of::<i32>();
        let ref mut body_reader = self.take(msg_len as u64);

        let ret = match ident {
            b'R' => try!(read_auth_message(body_reader)),
            b'E' => BackendMessage::ErrorResponse(
                try!(read_error_or_notice(body_reader))
            ),
            b'N' => BackendMessage::NoticeResponse(
                try!(read_error_or_notice(body_reader))
            ),
            b'S' => BackendMessage::ParameterStatus {
                parameter: try!(body_reader.read_cstr()),
                value: try!(body_reader.read_cstr()),
            },
            b'T' => BackendMessage::RowDescription(
                try!(read_row_description(body_reader))
            ),
            b'C' => BackendMessage::CommandComplete {
                command_tag: try!(body_reader.read_cstr())
            },
            b'K' => BackendMessage::BackendKeyData {
                process_id: try!(body_reader.read_u32::<BigEndian>()),
                secret_key: try!(body_reader.read_u32::<BigEndian>())
            },
            b'D' => BackendMessage::DataRow(try!(read_data_row(body_reader))),
            b'Z' => BackendMessage::ReadyForQuery {
                connection_status: match try!(body_reader.read_u8()) {
                    b'I' => ConnectionStatus::Idle,
                    b'T' => ConnectionStatus::InTransaction,
                    b'E' => ConnectionStatus::InFailedTransaction,
                    unknown => return Err(io::Error::new(
                        io::ErrorKind::Other,
                        "Unexpected transaction status indicator",
                        Some(format!("got {}", unknown)),
                    ))
                }
            },
            b'A' => BackendMessage::NotificationResponse {
                pid: try!(body_reader.read_u32::<BigEndian>()),
                channel: try!(body_reader.read_cstr()),
                payload: try!(body_reader.read_cstr())
            },
            b'I' => BackendMessage::EmptyQueryResponse,
            b'n' => BackendMessage::NoData,
            b'G' => BackendMessage::CopyInResponse {
                format: try!(body_reader.read_u8()),
                column_formats: {
                    let mut column_formats = vec![];
                    for _ in (0..try!(body_reader.read_u16::<BigEndian>())) {
                        column_formats.push(try!(body_reader.read_u16::<BigEndian>()));
                    }
                    column_formats
                },
            },
            unknown => {
                let ref mut buf = vec![];
                try!(body_reader.read_to_end(buf));
                return Err(io::Error::new(
                    io::ErrorKind::Other,
                    "Unknown message",
                    Some(format!("Got message type {}", char::from_u32(unknown as u32).unwrap())),
                ))
            },
        };

        println!("-> {:?}", ret);
        Ok(ret)
    }
}

fn read_auth_message<T: Read>(reader: &mut T) -> io::Result<BackendMessage> {
    Ok(match try!(reader.read_i32::<BigEndian>()) {
        0 => BackendMessage::AuthenticationOk,
        2 => BackendMessage::AuthenticationKerberosV5,
        3 => BackendMessage::AuthenticationCleartextPassword,
        5 => BackendMessage::AuthenticationMD5Password {
            salt: {
                let mut salt = [0; 4];
                try!(read_full(reader, &mut salt));
                salt
            }
        },
        6 => BackendMessage::AuthenticationSCMCredential,
        7 => BackendMessage::AuthenticationGSS,
        9 => BackendMessage::AuthenticationSSPI,
        unknown => return Err(io::Error::new(
            io::ErrorKind::Other,
            "Unexpected authentication tag",
            Some(format!("got {}", unknown)),
        )),
    })
}

fn read_data_row<T: Read>(reader: &mut T) -> io::Result<Vec<Option<String>>> {
    let fields_count = try!(reader.read_i16::<BigEndian>()) as usize;
    let mut values = Vec::with_capacity(fields_count);

    for _ in 0..fields_count {
        values.push(match try!(reader.read_i32::<BigEndian>()) {
            -1 => None,
            len => {
                let binval = try!(reader.read_exact(len as usize));
                let strval = try!(String::from_utf8(binval).map_err(|_| io::Error::new(
                    io::ErrorKind::Other,
                    "Received a non-utf8 string from server",
                    None
                )));
                Some(strval)
            }
        });
    }

    Ok(values)
}

fn read_error_or_notice<T: BufRead>(reader: &mut T) -> io::Result<ErrorOrNotice> {
    let mut severity = None;
    let mut code = None;
    let mut message = None;
    let mut detail = None;
    let mut hint = None;
    let mut position = None;
    let mut internal_position = None;
    let mut internal_query = None;
    let mut where_ = None;
    let mut file = None;
    let mut line = None;
    let mut routine = None;
    loop {
        let field_code = try!(reader.read_u8());
        if field_code == 0 {
            break;
        }
        let field_val = Some(try!(reader.read_cstr()));
        *match field_code {
            b'S' => &mut severity,
            b'C' => &mut code,
            b'M' => &mut message,
            b'D' => &mut detail,
            b'H' => &mut hint,
            b'P' => &mut position,
            b'p' => &mut internal_position,
            b'q' => &mut internal_query,
            b'W' => &mut where_,
            b'F' => &mut file,
            b'L' => &mut line,
            b'R' => &mut routine,
            _ => continue,
        } = field_val;
    }

    let code = code.unwrap();

    Ok(ErrorOrNotice {
        severity: severity.unwrap(),
        code: SqlState::from_code(&code),
        message: message.unwrap(),
        detail: detail,
        hint: hint,
        position: position.map(|x| x.parse().unwrap()),
        internal_position: internal_position.map(|x| x.parse().unwrap()),
        internal_query: internal_query,
        where_: where_,
        file: file,
        line: line.map(|x| x.parse().unwrap()),
        routine: routine,
    })
}

fn read_row_description<T: BufRead>(reader: &mut T) -> io::Result<Vec<FieldDescription>> {
    let len = try!(reader.read_i16::<BigEndian>()) as usize;
    let mut cols_descr = Vec::with_capacity(len);

    for _ in (0..len) {
        cols_descr.push(FieldDescription {
            name: try!(reader.read_cstr()),
            table_oid: match try!(reader.read_u32::<BigEndian>()) {
                0 => None,
                oid => Some(oid)
            },
            column_id: match try!(reader.read_i16::<BigEndian>()) {
                0 => None,
                id => Some(id)
            },
            type_oid: try!(reader.read_u32::<BigEndian>()),
            type_size: match try!(reader.read_i16::<BigEndian>()) {
                len if len < 0 => FieldTypeSize::Variable,
                len => FieldTypeSize::Fixed(len as usize),
            },
            type_modifier: try!(reader.read_i32::<BigEndian>()),
            format: match try!(reader.read_i16::<BigEndian>()) {
                0 => FieldFormat::Text,
                1 => FieldFormat::Binary,
                unknown => return Err(io::Error::new(
                    io::ErrorKind::Other,
                    "Unknown column format code",
                    Some(format!("Got {}", unknown)),
                ))
            }
        });
    }

    Ok(cols_descr)
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

#[derive(Debug)]
pub enum ConnectError {
    ErrorResponse(ErrorOrNotice),
    IoError(io::Error),
}

impl ::std::error::FromError<io::Error> for ConnectError {
    fn from_error(err: io::Error) -> ConnectError {
        ConnectError::IoError(err)
    }
}

// enum ConnectError {
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


pub struct Connection<TStream: Write> {
    stream: BufStream<TStream>,
}

// pub enum StatementResult {
//     NonQuery(String),
//     Rowset(Vec<FieldDescription>),
// }

pub fn connect_tcp<T: ToSocketAddrs>(addr: T,
                                    database: &str,
                                    user: &str,
                                    password: &str)
                                    -> ConnectResult<TcpStream> {

    let stream = try!(TcpStream::connect(addr));
    Connection::connect_database(
        stream,
        database,
        user,
        password,
    )
}


type ConnectResult<TStream> = Result<Connection<TStream>, ConnectError>;


impl<TStream: BufRead+Write> Connection<TStream> {

    pub fn connect_database(stream: TStream,
                            database: &str,
                            user: &str,
                            password: &str)
                            -> ConnectResult<TStream>
    {

        let mut stream = BufStream::new(stream);

        try!(stream.write_startup_message(user, database));

        loop {
            match try!(stream.read_message()) {
                BackendMessage::AuthenticationMD5Password { salt } => {
                    // let mut hasher = Md5::new();
                    // hasher.input_str(password);
                    // hasher.input_str(user);
                    // let output = hasher.result_str();
                    // hasher.reset();
                    // hasher.input_str(&output);
                    // hasher.input(&salt);
                    // let output = format!("md5{}", hasher.result_str());
                    // try!(stream.write_password_message(&output));
                },
                BackendMessage::AuthenticationCleartextPassword => {
                    try!(stream.write_password_message(password));
                },
                BackendMessage::AuthenticationOk => { /* pass */ },
                BackendMessage::ErrorResponse(e) => return Err(ConnectError::ErrorResponse(e)),
                BackendMessage::BackendKeyData { .. } => {},
                BackendMessage::ParameterStatus { .. } => {},
                BackendMessage::ReadyForQuery(ConnectionStatus::Idle) => break,
                unexpected => return Err(ConnectError::IoError(io::Error {
                    kind: io::ErrorKind::Other,
                    desc: "Unexpected message while startup.",
                    detail: Some(format!("{:?}", unexpected)),
                })),
            }
        }

        Ok(Connection { stream: stream })
    }

    pub fn execute_script(&mut self, script: &str) -> io::Result<ExecuteEventIterator<BufStream<TStream>>> {
        try!(self.stream.write_query_message(script));
        Ok(ExecuteEventIterator::new(&mut self.stream))
    }

    pub fn execute_query(&mut self, query: &str) -> io::Result<Vec<Row>> {
        self.execute_script(query)
            .map(|msg_iter| msg_iter
                .filter_map(|msg| match msg {
                    ExecuteEvent::RowFetched(row) => Some(row),
                    _ => None,
                })
                .collect::<Vec<Row>>()
            )
    }

    // pub fn query<TRel: ::serialize::Decodable>(&mut self, query: &str) -> io::Result<Vec<TRel>> {
    //     use self::ExecuteEvent::{
    //         RowFetched,
    //         SqlErrorOccured,
    //     };

    //     let mut res = vec![];
    //     for msg_res in try!(self.execute_script(query)) {
    //         match msg_res {
    //             RowFetched(row) => res.push(try!(decoder::decode_row(row).map_err(|decode_err| io::Error {
    //                 kind: io::ErrorKind::Other,
    //                 desc: "Row decode error",
    //                 detail: Some(format!("{:?}", decode_err)),
    //             }))),
    //             SqlErrorOccured(err) => return Err(io::Error {
    //                 kind: io::ErrorKind::Other,
    //                 desc: "Error response while queriyng",
    //                 detail: Some(format!("{:?}", err)),
    //             }),
    //             _ => {},
    //         }
    //     }

    //     Ok(res)

    // }

    pub fn finish(mut self) -> io::Result<()> {
        self.stream.write_terminate_message()
    }
}



trait MessageWriter {
    fn write_startup_message(&mut self, user: &str, database: &str) -> io::Result<()>;
    fn write_password_message(&mut self, password: &str) -> io::Result<()>;
    fn write_query_message(&mut self, query: &str) -> io::Result<()>;
    fn write_terminate_message(&mut self) -> io::Result<()>;
}

impl<T> MessageWriter for T where T: Write {

    fn write_startup_message(&mut self, user: &str, database: &str) -> io::Result<()> {
        let msg_len = i32::BYTES + // self
                      i32::BYTES + // protocol
                      cstr_len("user") + cstr_len(user) +
                      cstr_len("database") + cstr_len(database) +
                      1; // terminating zero

        try!(self.write_i32::<BigEndian>(msg_len as i32));
        try!(self.write_i32::<BigEndian>(0x0003_0000)); // protocol version
        try!(self.write_cstr("user"));
        try!(self.write_cstr(user));
        try!(self.write_cstr("database"));
        try!(self.write_cstr(database));
        try!(self.write_u8(0));

        self.flush()
    }

    fn write_password_message(&mut self, password: &str) -> io::Result<()> {
        let msg_len = i32::BYTES + cstr_len(password);

        try!(self.write_u8(b'p'));
        try!(self.write_i32::<BigEndian>(msg_len as i32));
        try!(self.write_cstr(password));

        self.flush()
    }

    fn write_query_message(&mut self, query: &str) -> io::Result<()> {
        let msg_len = i32::BYTES + cstr_len(query);

        try!(self.write_u8(b'Q'));
        try!(self.write_i32::<BigEndian>(msg_len as i32));
        try!(self.write_cstr(query));

        self.flush()
    }

    fn write_terminate_message(&mut self) -> io::Result<()> {
        try!(self.write_u8(b'X'));
        try!(self.write_i32::<BigEndian>(i32::BYTES as i32));

        self.flush()
    }
}




type Row = Vec<Option<String>>;




#[derive(Debug)]
pub enum ExecuteEvent {
    NonQueryExecuted(String),
    RowsetBegin(Vec<FieldDescription>),
    RowFetched(Vec<Option<String>>),
    RowsetEnd,
    SqlErrorOccured(ErrorOrNotice),
    IoErrorOccured(io::Error),
    Notice(ErrorOrNotice),
}



struct ExecuteEventIterator<'a, TMessageReader: MessageReader +'a> {
    msg_reader: &'a mut TMessageReader,
    is_exhausted: bool,
    is_in_rowset: bool,
}

impl<'a, TMessageReader: MessageReader> ExecuteEventIterator<'a, TMessageReader> {
    fn new(msg_reader: &'a mut TMessageReader) -> ExecuteEventIterator<'a, TMessageReader> {
        ExecuteEventIterator {
            msg_reader: msg_reader,
            is_exhausted: false,
            is_in_rowset: false,
        }
    }
}

impl<'a, TMessageReader: MessageReader> Iterator for ExecuteEventIterator<'a, TMessageReader> {

    type Item = ExecuteEvent;

    fn next(&mut self) -> Option<ExecuteEvent> {
        use self::ExecuteEvent::*;

        if self.is_exhausted {
            return None;
        }

        let message = match self.msg_reader.read_message() {
            Ok(message) => message,
            Err(err) => return Some(IoErrorOccured(err)),
        };

        match message {

            BackendMessage::ReadyForQuery(..) => {
                self.is_exhausted = true;
                None
            },

            BackendMessage::RowDescription(descr) => {
                self.is_in_rowset = true;
                Some(RowsetBegin(descr))
            },

            BackendMessage::ErrorResponse(e) => Some(SqlErrorOccured(e)),

            BackendMessage::NoticeResponse(n) => Some(Notice(n)),

            BackendMessage::DataRow(row) => Some(RowFetched(row)),

            BackendMessage::CommandComplete(tag) => {
                Some(if self.is_in_rowset {
                    self.is_in_rowset = false;
                    RowsetEnd
                } else {
                    NonQueryExecuted(tag)
                })
            },

            unexpected => Some(IoErrorOccured(io::Error::new(
                io::ErrorKind::Other,
                "Unexpected message recived.",
                 Some(format!("Got {:?}", unexpected)),
            ))),

        }
    }
}



fn read_full<R: Read>(rdr: &mut R, buf: &mut [u8]) -> io::Result<()> {
    let mut nread = 0usize;
    while nread < buf.len() {
        match rdr.read(&mut buf[nread..]) {
            Ok(0) => return io::Error::new(io::ErrorKind::Other,
                                           "unexpected EOF", None),
            Ok(n) => nread += n,
            Err(ref e) if e.kind() == io::ErrorKind::Interrupted => {},
            e @ Err(..) => return e,
        }
    }
    Ok(())
}
