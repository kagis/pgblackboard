extern crate crypto;

use self::crypto::md5::Md5;
use self::crypto::digest::Digest;

use std::io::{
    TcpStream,
    BufferedStream,
    ByRefReader,
    IoResult,
    IoError,
    OtherIoError,
    Stream,
};

use std::io::net::ip::ToSocketAddr;
use std::io::util::LimitReader;
use std::mem;
use std::char;
use std::i32;

pub use self::sqlstate::{
    SqlState,
    SqlStateClass,
};

use self::cstr::{
    CStringWriter,
    CStringReader,
    cstr_len,
};

use self::BackendMessage::*;

mod sqlstate;
mod decoder;
mod cstr;



pub type Oid = u32;


#[derive(Show)]
pub enum TypeSize {
    Fixed(usize),
    Variable
}

#[derive(Show)]
pub enum FieldFormat {
    Text,
    Binary
}


#[derive(Show)]
pub struct FieldDescription {
    pub name: String,
    pub table_oid: Option<Oid>,
    pub column_id: Option<i16>,
    pub type_oid: Oid,
    pub type_size: TypeSize,
    pub type_modifier: i32,
    pub format: FieldFormat,
}

#[derive(Show)]
enum ConnectionStatus {
    Idle,
    InTransaction,
    InFailedTransaction
}

#[derive(Show)]
pub struct ErrorOrNotice {
    // S
    pub severity: String, //, the field contents are ERROR, FATAL, or PANIC (in an error message), or WARNING, NOTICE, DEBUG, INFO, or LOG (in a notice message), or a localized translation of one of these. Always present.

    // C
    pub code: String, //the SQLSTATE code for the error (see Appendix A). Not localizable. Always present.

    pub sqlstate: SqlState,

    pub sqlstate_class: SqlStateClass,

    // M
    pub message: String, // the primary human-readable error message. This should be accurate but terse (typically one line). Always present.

    // D
    pub detail: Option<String>, // an optional secondary error message carrying more detail about the problem. Might run to multiple lines.

    // H
    pub hint: Option<String>, //an optional suggestion what to do about the problem. This is intended to differ from Detail in that it offers advice (potentially inappropriate) rather than hard facts. Might run to multiple lines.

    // P
    pub position: Option<usize>, // the field value is a decimal ASCII integer, indicating an error cursor position as an index into the original query string. The first character has index 1, and positions are measured in characters not bytes.

    // p
    pub internal_position: Option<usize>, // this is defined the same as the P field, but it is used when the cursor position refers to an internally generated command rather than the one submitted by the client. The q field will always appear when this field appears.

    // q
    pub internal_query: Option<String>, // the text of a failed internally-generated command. This could be, for example, a SQL query issued by a PL/pgSQL function.

    // W
    pub where_: Option<String>, // an indication of the context in which the error occurred. Presently this includes a call stack traceback of active procedural language functions and internally-generated queries. The trace is one entry per line, most recent first.

    // F
    pub file: Option<String>, // the file name of the source-code location where the error was reported.

    // L
    pub line: Option<usize>, // the line number of the source-code location where the error was reported.

    // R
    pub routine: Option<String>, // the name of the source-code routine reporting the error.
}



#[derive(Show)]
pub enum BackendMessage {
    AuthenticationCleartextPassword,
    AuthenticationGSS,
    AuthenticationKerberosV5,
    AuthenticationMD5Password {
        salt: [u8; 4]
    },
    AuthenticationOk,
    AuthenticationSCMCredential,
    AuthenticationSSPI,
    BackendKeyData {
        process_id: u32,
        secret_key: u32
    },
    //BindComplete,
    //CloseComplete,
    CommandComplete(String),
    CopyInResponse {
        format: u8,
        column_formats: Vec<u16>,
    },
    DataRow(Vec<Option<String>>),
    EmptyQueryResponse,
    ErrorResponse(ErrorOrNotice),
    NoData,
    NoticeResponse(ErrorOrNotice),
    NotificationResponse {
        pid: u32,
        channel: String,
        payload: String,
    },
    ParameterStatus {
        parameter: String,
        value: String,
    },
    //ParseComplete,
    //PortalSuspended,
    ReadyForQuery(ConnectionStatus),
    RowDescription(Vec<FieldDescription>),
}

trait MessageReader {
    fn read_message(&mut self) -> IoResult<BackendMessage>;
}

impl<T: Buffer> MessageReader for T  {
    fn read_message(&mut self) -> IoResult<BackendMessage> {
        let ident = try!(self.read_u8());
        let msg_len_including_self = try!(self.read_be_i32());
        let msg_len = msg_len_including_self as usize - mem::size_of::<i32>();
        let ref mut limrdr = LimitReader::new(self.by_ref(), msg_len);

        let ret = match ident {
            b'R' => try!(read_auth_message(limrdr)),
            b'E' => ErrorResponse(try!(read_error_or_notice(limrdr))),
            b'N' => NoticeResponse(try!(read_error_or_notice(limrdr))),
            b'S' => ParameterStatus {
                parameter: try!(limrdr.read_cstr()),
                value: try!(limrdr.read_cstr()),
            },
            b'T' => RowDescription(try!(read_row_description(limrdr))),
            b'C' => CommandComplete(try!(limrdr.read_cstr())),
            b'K' => BackendKeyData {
                process_id: try!(limrdr.read_be_u32()),
                secret_key: try!(limrdr.read_be_u32())
            },
            b'D' => DataRow(try!(read_data_row(limrdr))),
            b'Z' => ReadyForQuery(match try!(limrdr.read_u8()) {
                b'I' => ConnectionStatus::Idle,
                b'T' => ConnectionStatus::InTransaction,
                b'E' => ConnectionStatus::InFailedTransaction,
                unknown => return Err(IoError {
                    kind: OtherIoError,
                    desc: "Unexpected transaction status indicator",
                    detail: Some(format!("got {}", unknown)),
                })
            }),
            b'A' => NotificationResponse {
                pid: try!(limrdr.read_be_u32()),
                channel: try!(limrdr.read_cstr()),
                payload: try!(limrdr.read_cstr())
            },
            b'I' => EmptyQueryResponse,
            b'n' => NoData,
            b'G' => CopyInResponse {
                format: try!(limrdr.read_u8()),
                column_formats: {
                    let mut column_formats = vec![];
                    for _ in range(0, try!(limrdr.read_be_u16())) {
                        column_formats.push(try!(limrdr.read_be_u16()));
                    }
                    column_formats
                },
            },
            unknown => {
                try!(limrdr.read_to_end());
                return Err(IoError {
                    kind: OtherIoError,
                    desc: "Unknown message",
                    detail: Some(format!("Got message type {}", char::from_u32(unknown as u32).unwrap())),
                })
            },
        };

        debug!("-> {:?}", ret);
        Ok(ret)
    }
}

fn read_auth_message<T: Reader>(reader: &mut T) -> IoResult<BackendMessage> {
    Ok(match try!(reader.read_be_i32()) {
        0 => AuthenticationOk,
        2 => AuthenticationKerberosV5,
        3 => AuthenticationCleartextPassword,
        5 => AuthenticationMD5Password {
            salt: {
                let mut salt = [0; 4];
                try!(reader.read_at_least(salt.len(), &mut salt));
                salt
            }
        },
        6 => AuthenticationSCMCredential,
        7 => AuthenticationGSS,
        9 => AuthenticationSSPI,
        unknown => return Err(IoError {
            kind: OtherIoError,
            desc: "Unexpected authentication tag",
            detail: Some(format!("got {}", unknown)),
        }),
    })
}

fn read_data_row<T: Reader>(reader: &mut T) -> IoResult<Vec<Option<String>>> {
    let fields_count = try!(reader.read_be_i16()) as usize;
    let mut values = Vec::with_capacity(fields_count);

    for _ in range(0, fields_count) {
        values.push(match try!(reader.read_be_i32()) {
            -1 => None,
            len => {
                let binval = try!(reader.read_exact(len as usize));
                let strval = try!(String::from_utf8(binval).map_err(|_| IoError {
                    kind: OtherIoError,
                    desc: "Received a non-utf8 string from server",
                    detail: None
                }));
                Some(strval)
            }
        });
    }

    Ok(values)
}

fn read_error_or_notice<T: Buffer>(reader: &mut T) -> IoResult<ErrorOrNotice> {
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
    let (sqlstate_class, sqlstate) = code.parse().unwrap();

    Ok(ErrorOrNotice {
        severity: severity.unwrap(),
        sqlstate: sqlstate,
        sqlstate_class: sqlstate_class,
        code: code,
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

fn read_row_description<T: Buffer>(reader: &mut T) -> IoResult<Vec<FieldDescription>> {
    let len = try!(reader.read_be_i16()) as usize;
    let mut cols_descr = Vec::with_capacity(len);

    for _ in range(0, len) {
        cols_descr.push(FieldDescription {
            name: try!(reader.read_cstr()),
            table_oid: match try!(reader.read_be_u32()) {
                0 => None,
                oid => Some(oid)
            },
            column_id: match try!(reader.read_be_i16()) {
                0 => None,
                id => Some(id)
            },
            type_oid: try!(reader.read_be_u32()),
            type_size: match try!(reader.read_be_i16()) {
                len if len < 0 => TypeSize::Variable,
                len => TypeSize::Fixed(len as usize),
            },
            type_modifier: try!(reader.read_be_i32()),
            format: match try!(reader.read_be_i16()) {
                0 => FieldFormat::Text,
                1 => FieldFormat::Binary,
                unknown => return Err(IoError {
                    kind: OtherIoError,
                    desc: "Unknown column format code",
                    detail: Some(format!("Got {}", unknown)),
                })
            }
        });
    }

    Ok(cols_descr)
}








// #[derive(Show)]
// pub enum PgError {
//     //AuthenticationError,
//     //DatabaseNotExists,
//     UnexpectedMessage(BackendMessage),
//     ErrorMessage(ErrorOrNotice),
//     TransportError(IoError),
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

// impl ::std::error::FromError<IoError> for PgError {
//     fn from_error(err: IoError) -> PgError {
//         PgError::TransportError(err)
//     }
// }

// pub type PgResult<T> = Result<T, PgError>;

#[derive(Show)]
pub enum ConnectError {
    ErrorResponse(ErrorOrNotice),
    IoError(IoError),
}

impl ::std::error::FromError<IoError> for ConnectError {
    fn from_error(err: IoError) -> ConnectError {
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


pub struct Connection<TStream: Stream> {
    stream: BufferedStream<TStream>,
}

// pub enum StatementResult {
//     NonQuery(String),
//     Rowset(Vec<FieldDescription>),
// }

pub fn connect_tcp<T: ToSocketAddr>(addr: T,
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


impl<TStream: Stream> Connection<TStream> {

    pub fn connect_database(stream: TStream,
                            database: &str,
                            user: &str,
                            password: &str)
                            -> ConnectResult<TStream>
    {

        let mut stream = BufferedStream::new(stream);

        try!(stream.write_startup_message(user, database));

        loop {
            match try!(stream.read_message()) {
                AuthenticationMD5Password { salt } => {
                    let mut hasher = Md5::new();
                    hasher.input_str(password);
                    hasher.input_str(user);
                    let output = hasher.result_str();
                    hasher.reset();
                    hasher.input_str(&output[]);
                    hasher.input(&salt);
                    let output = format!("md5{}", hasher.result_str());
                    try!(stream.write_password_message(&output[]));
                },
                AuthenticationCleartextPassword => {
                    try!(stream.write_password_message(password));
                },
                AuthenticationOk => { /* pass */ },
                ErrorResponse(e) => return Err(ConnectError::ErrorResponse(e)),
                BackendKeyData { .. } => {},
                ParameterStatus { .. } => {},
                ReadyForQuery(ConnectionStatus::Idle) => break,
                unexpected => return Err(ConnectError::IoError(IoError {
                    kind: OtherIoError,
                    desc: "Unexpected message while startup.",
                    detail: Some(format!("{:?}", unexpected)),
                })),
            }
        }

        Ok(Connection { stream: stream })
    }

    pub fn execute_script(&mut self, script: &str) -> IoResult<ExecuteEventIterator<BufferedStream<TStream>>> {
        try!(self.stream.write_query_message(script));
        Ok(ExecuteEventIterator::new(&mut self.stream))
    }

    pub fn execute_query(&mut self, query: &str) -> IoResult<Vec<Row>> {
        self.execute_script(query)
            .map(|msg_iter| msg_iter
                .filter_map(|msg| match msg {
                    Ok(ExecuteEvent::RowFetched(row)) => Some(row),
                    _ => None,
                })
                .collect::<Vec<Row>>()
            )
    }

    pub fn query<TRel: ::serialize::Decodable>(&mut self, query: &str) -> IoResult<Vec<TRel>> {
        use self::ExecuteEvent::{
            RowFetched,
            ErrorOccured,
        };

        let mut res = vec![];
        for msg_res in try!(self.execute_script(query)) {
            match try!(msg_res) {
                RowFetched(row) => res.push(try!(decoder::decode_row(row).map_err(|decode_err| IoError {
                    kind: OtherIoError,
                    desc: "Row decode error",
                    detail: None,
                }))),
                ErrorOccured(err) => return Err(IoError {
                    kind: OtherIoError,
                    desc: "Error response while queriyng",
                    detail: Some(format!("{:?}", err)),
                }),
                _ => {},
            }
        }

        Ok(res)

    }

    pub fn finish(&mut self) -> IoResult<()> {
        self.stream.write_terminate_message()
    }
}



trait MessageWriter {
    fn write_startup_message(&mut self, user: &str, database: &str) -> IoResult<()>;
    fn write_password_message(&mut self, password: &str) -> IoResult<()>;
    fn write_query_message(&mut self, query: &str) -> IoResult<()>;
    fn write_terminate_message(&mut self) -> IoResult<()>;
}

impl<T> MessageWriter for T where T: Writer {

    fn write_startup_message(&mut self, user: &str, database: &str) -> IoResult<()> {
        let msg_len = i32::BYTES + // self
                      i32::BYTES + // protocol
                      cstr_len("user") + cstr_len(user) +
                      cstr_len("database") + cstr_len(database) +
                      1; // terminating zero

        try!(self.write_be_i32(msg_len as i32));
        try!(self.write_be_i32(0x0003_0000)); // protocol version
        try!(self.write_cstr("user"));
        try!(self.write_cstr(user));
        try!(self.write_cstr("database"));
        try!(self.write_cstr(database));
        try!(self.write_u8(0));

        self.flush()
    }

    fn write_password_message(&mut self, password: &str) -> IoResult<()> {
        let msg_len = i32::BYTES + cstr_len(password);

        try!(self.write_u8(b'p'));
        try!(self.write_be_i32(msg_len as i32));
        try!(self.write_cstr(password));

        self.flush()
    }

    fn write_query_message(&mut self, query: &str) -> IoResult<()> {
        let msg_len = i32::BYTES + cstr_len(query);

        try!(self.write_u8(b'Q'));
        try!(self.write_be_i32(msg_len as i32));
        try!(self.write_cstr(query));

        self.flush()
    }

    fn write_terminate_message(&mut self) -> IoResult<()> {
        try!(self.write_u8(b'X'));
        try!(self.write_be_i32(i32::BYTES as i32));

        self.flush()
    }
}




type Row = Vec<Option<String>>;


struct MessageIterator<'a, T: MessageReader + 'a> {
    msg_reader: &'a mut T
}

impl<'a, T: MessageReader> Iterator<> for MessageIterator<'a, T> {
    type Item = IoResult<BackendMessage>;
    fn next(&mut self) -> Option<IoResult<BackendMessage>> {
        Some(self.msg_reader.read_message())
    }
}



#[derive(Show)]
pub enum ExecuteEvent {
    NonQueryExecuted(String),
    RowsetBegin(Vec<FieldDescription>),
    RowFetched(Vec<Option<String>>),
    RowsetEnd,
    ErrorOccured(ErrorOrNotice),
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

    type Item = IoResult<ExecuteEvent>;

    fn next(&mut self) -> Option<IoResult<ExecuteEvent>> {
        use self::ExecuteEvent::*;

        if self.is_exhausted {
            return None;
        }

        loop {
            let msg = match self.msg_reader.read_message() {
                Ok(msg) => msg,
                Err(err) => return Some(Err(err)),
            };

            return Some(Ok(match msg {

                ReadyForQuery(..) => {
                    self.is_exhausted = true;
                    return None;
                },

                RowDescription(descr) => {
                    self.is_in_rowset = true;
                    RowsetBegin(descr)
                },

                ErrorResponse(e) => ErrorOccured(e),
                NoticeResponse(n) => Notice(n),
                DataRow(row) => RowFetched(row),

                CommandComplete(tag) => {
                    if self.is_in_rowset {
                        RowsetEnd
                    } else {
                        NonQueryExecuted(tag)
                    }
                },

                unexpected => return Some(Err(IoError {
                    kind: OtherIoError,
                    desc: "Unexpected message recived.",
                    detail: Some(format!("Got {:?}", unexpected)),
                })),

            }))
        }
    }
}

