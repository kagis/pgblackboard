use std::io;
use std::io::Read;
use std::mem;
use std::collections::BTreeMap;
use std::error;
use std::fmt;
use super::SqlState;


pub fn read_message<T: Read>(reader: &mut T) -> io::Result<BackendMessage> {
    let ident = try!(reader.read_u8());

    let msg_len_including_self = try!(reader.read_i32_be()) as usize;
    let msg_len = msg_len_including_self - mem::size_of::<i32>();

    if msg_len > 10 * 1024 * 1024 {
        return Err(io::Error::new(
            io::ErrorKind::Other,
            format!("Backend message too large \
                     (ident: {0}, len: {1})",
                     ident, msg_len)
        ))
    }

    let ref mut body_reader = reader.take(msg_len as u64);

    let ret = match ident {
        b'R' => match try!(body_reader.read_i32_be()) {
            0 => BackendMessage::AuthenticationOk,
            2 => BackendMessage::AuthenticationKerberosV5,
            3 => BackendMessage::AuthenticationCleartextPassword,
            5 => BackendMessage::AuthenticationMD5Password {
                salt: try!(body_reader.read_u8x4())
            },
            6 => BackendMessage::AuthenticationSCMCredential,
            7 => BackendMessage::AuthenticationGSS,
            9 => BackendMessage::AuthenticationSSPI,
            unknown => return Err(io::Error::new(
                io::ErrorKind::Other,
                format!("Unknown authentication tag '{}'", unknown)
            )),
        },
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
            process_id: try!(body_reader.read_u32_be()),
            secret_key: try!(body_reader.read_u32_be())
        },
        b'D' => BackendMessage::DataRow(try!(read_data_row(body_reader))),
        b'Z' => BackendMessage::ReadyForQuery {
            transaction_status: match try!(body_reader.read_u8()) {
                b'I' => TransactionStatus::Idle,
                b'T' => TransactionStatus::InTransaction,
                b'E' => TransactionStatus::InFailedTransaction,
                unknown => return Err(io::Error::new(
                    io::ErrorKind::Other,
                    "Unknown transaction status indicator",
                    //Some(format!("got {}", unknown)),
                ))
            }
        },
        b'A' => BackendMessage::NotificationResponse {
            pid: try!(body_reader.read_u32_be()),
            channel: try!(body_reader.read_cstr()),
            payload: try!(body_reader.read_cstr())
        },
        b'I' => BackendMessage::EmptyQueryResponse,
        b'n' => BackendMessage::NoData,
        b'G' => BackendMessage::CopyInResponse {
            format: try!(body_reader.read_u8()),
            column_formats: {
                let mut column_formats = vec![];
                for _ in 0..try!(body_reader.read_u16_be()) {
                    column_formats.push(try!(body_reader.read_u16_be()));
                }
                column_formats
            },
        },
        b't' => BackendMessage::ParameterDescription {
            typ_ids: {
                let params_count = try!(body_reader.read_i16_be());
                let mut typ_ids = vec![];
                for _ in 0..params_count {
                    typ_ids.push(try!(body_reader.read_u32_be()));
                }
                typ_ids
            }
        },
        b'1' => BackendMessage::ParseComplete,
        b'2' => BackendMessage::BindComplete,
        b'3' => BackendMessage::CloseComplete,
        b's' => BackendMessage::PortalSuspended,
        unknown => {
            let ref mut buf = vec![];
            try!(body_reader.read_to_end(buf));
            return Err(io::Error::new(
                io::ErrorKind::Other,
                format!("Unknown message ident '{}'", unknown)
            ))
        },
    };

    match &ret {
        // &BackendMessage::DataRow(..) => {},
        other => println!("-> {:#?}", other)
    };

    Ok(ret)
}

/// [Numeric object identifer.]
/// (http://www.postgresql.org/docs/9.4/static/datatype-oid.html)
pub type Oid = u32;

pub type Row = Vec<Option<String>>;

#[derive(Debug)]
#[derive(PartialEq)]
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
    pub typ_oid: Oid,

    /// The type modifier (see pg_attribute.atttypmod).
    /// The meaning of the modifier is type-specific.
    pub typ_modifier: i32,

    /// The data type size (see pg_type.typlen).
    /// Note that negative values denote variable-width types.
    pub typ_size: DataTypeSize,

    /// The format code being used for the field.
    /// Currently will be zero (text) or one (binary).
    /// In a RowDescription returned from the statement variant of Describe,
    /// the format code is not yet known and will always be zero.
    pub format: FieldFormat,
}

#[derive(Debug)]
#[derive(PartialEq)]
pub enum DataTypeSize {
    Fixed(usize),
    Variable,
}

#[derive(Debug)]
#[derive(PartialEq)]
pub enum FieldFormat {
    Text,
    Binary,
}

#[derive(Debug)]
#[derive(PartialEq)]
pub enum TransactionStatus {
    Idle,
    InTransaction,
    InFailedTransaction,
}

#[derive(Debug)]
#[derive(PartialEq)]
#[derive(RustcEncodable)]
pub struct PgErrorOrNotice {

    /// The field contents are ERROR, FATAL, or PANIC (in an error message),
    /// or WARNING, NOTICE, DEBUG, INFO, or LOG (in a notice message), or a
    /// localized translation of one of these. Always present.
    pub severity: String,

    /// The SQLSTATE code for the error (see Appendix A). Not localizable.
    /// Always present.
    pub code: SqlState,

    /// The primary human-readable error message. This should be accurate
    /// but terse (typically one line). Always present.
    pub message: String,

    /// An optional secondary error message carrying more detail about
    /// the problem. Might run to multiple lines.
    pub detail: Option<String>,

    /// An optional suggestion what to do about the problem.
    /// This is intended to differ from Detail in that it offers advice
    /// (potentially inappropriate) rather than hard facts.
    /// Might run to multiple lines.
    pub hint: Option<String>,

    /// The field value is a decimal ASCII integer, indicating an error cursor
    /// position as an index into the original query string.
    /// The first character has index 1,
    /// and positions are measured in characters not bytes.
    pub position: Option<usize>,

    /// This is defined the same as the P field, but it is used when the cursor
    /// position refers to an internally generated command rather than the one
    /// submitted by the client. The q field will always appear when this
    /// field appears.
    pub internal_position: Option<usize>,

    /// The text of a failed internally-generated command. This could be,
    /// for example, a SQL query issued by a PL/pgSQL function.
    pub internal_query: Option<String>,

    /// An indication of the context in which the error occurred.
    /// Presently this includes a call stack traceback of active procedural
    /// language functions and internally-generated queries. The trace is
    /// one entry per line, most recent first.
    pub where_: Option<String>,

    /// The file name of the source-code location
    /// where the error was reported.
    pub file: Option<String>,

    /// The line number of the source-code location
    /// where the error was reported.
    pub line: Option<usize>,

    /// The name of the source-code routine reporting the error.
    pub routine: Option<String>,

    /// Schema name: if the error was associated with a specific
    /// database object, the name of the schema containing that object, if any.
    pub schema_name: Option<String>,

    /// Table name: if the error was associated with a specific table,
    /// the name of the table. (Refer to the schema name field for
    /// the name of the table's schema.)
    pub table_name: Option<String>,

    /// Column name: if the error was associated with a specific table column,
    /// the name of the column. (Refer to the schema and table name fields
    /// to identify the table.)
    pub column_name: Option<String>,

    /// Data type name: if the error was associated with a specific data type,
    /// the name of the data type. (Refer to the schema name field for the
    /// name of the data type's schema.)
    pub datatype_name: Option<String>,

    /// Constraint name: if the error was associated with a specific constraint,
    /// the name of the constraint. Refer to fields listed above for the associated
    /// table or domain. (For this purpose, indexes are treated as constraints,
    /// even if they weren't created with constraint syntax.)
    pub constraint_name: Option<String>,
}

impl error::Error for PgErrorOrNotice {
    fn description(&self) -> &str {
        &self.message[..]
    }
}

impl fmt::Display for PgErrorOrNotice {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{}", self.message)
    }
}

impl ::std::convert::From<io::Error> for PgErrorOrNotice {
    fn from(err: io::Error) -> PgErrorOrNotice {
        PgErrorOrNotice {
            severity: "ERROR".to_owned(),
            code: SqlState::IoError,
            message: format!("{}", err), // .description().to_owned(),
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
        }
    }
}

fn read_error_or_notice<T: Read>(reader: &mut T) -> io::Result<PgErrorOrNotice> {
    let mut fields = BTreeMap::new();
    while let field_code @ 1 ... 255 = try!(reader.read_u8()) {
        fields.insert(field_code, try!(reader.read_cstr()));
    }
    Ok(PgErrorOrNotice {
        severity: fields.remove(&b'S').unwrap_or("".to_string()),
        code: fields.remove(&b'C').map_or(SqlState::Unknown, |c| SqlState::from_code(&c)),
        message: fields.remove(&b'M').unwrap_or("".to_string()),
        detail: fields.remove(&b'D'),
        hint: fields.remove(&b'H'),
        position: fields.remove(&b'P').and_then(|x| x.parse().ok()),
        internal_position: fields.remove(&b'p').and_then(|x| x.parse().ok()),
        internal_query: fields.remove(&b'q'),
        where_: fields.remove(&b'W'),
        file: fields.remove(&b'F'),
        line: fields.remove(&b'L').and_then(|x| x.parse().ok()),
        routine: fields.remove(&b'R'),
        schema_name: fields.remove(&b's'),
        table_name: fields.remove(&b't'),
        column_name: fields.remove(&b'c'),
        datatype_name: fields.remove(&b'd'),
        constraint_name: fields.remove(&b'n'),
    })
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

    BindComplete,

    CloseComplete,

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
    ErrorResponse(PgErrorOrNotice),

    /// Identifies the message as a no-data indicator.
    NoData,

    /// Byte1('N') Identifies the message as a notice.
    NoticeResponse(PgErrorOrNotice),

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

    ParameterDescription {
        typ_ids: Vec<Oid>
    },

    ParseComplete,

    PortalSuspended,

    /// Byte1('Z'). ReadyForQuery is sent whenever the backend
    /// is ready for a new query cycle.
    ReadyForQuery {

        /// Current backend transaction status indicator.
        /// Possible values are 'I' if idle (not in a transaction block);
        /// 'T' if in a transaction block; or 'E' if in a failed transaction
        /// block (queries will be rejected until block is ended).
        transaction_status: TransactionStatus
    },

    /// Byte1('T') Identifies the message as a row description.
    RowDescription(Vec<FieldDescription>),
}


fn read_row_description<T: Read>(reader: &mut T) -> io::Result<Vec<FieldDescription>> {
    let len = try!(reader.read_i16_be()) as usize;
    let mut cols_descr = Vec::with_capacity(len);

    for _ in 0..len {
        cols_descr.push(FieldDescription {
            name: try!(reader.read_cstr()),
            table_oid: match try!(reader.read_u32_be()) {
                0 => None,
                oid => Some(oid)
            },
            column_id: match try!(reader.read_i16_be()) {
                0 => None,
                id => Some(id)
            },
            typ_oid: try!(reader.read_u32_be()),
            typ_size: match try!(reader.read_i16_be()) {
                len if len < 0 => DataTypeSize::Variable,
                len => DataTypeSize::Fixed(len as usize),
            },
            typ_modifier: try!(reader.read_i32_be()),
            format: match try!(reader.read_i16_be()) {
                0 => FieldFormat::Text,
                1 => FieldFormat::Binary,
                unknown => return Err(io::Error::new(
                    io::ErrorKind::Other,
                    format!("Unknown column format code '{}'. \
                             0 or 1 expected.", unknown)
                ))
            }
        });
    }

    Ok(cols_descr)
}

fn read_data_row<T: Read>(reader: &mut T) -> io::Result<Vec<Option<String>>> {
    let fields_count = try!(reader.read_i16_be()) as usize;
    let mut values = Vec::with_capacity(fields_count);

    for _ in 0..fields_count {
        values.push(match try!(reader.read_i32_be()) {
            -1 => None,
            len => {
                let mut buf = vec![0; len as usize];
                try!(reader.read_exact(&mut buf));
                let strval = try!(String::from_utf8(buf).map_err(|err| io::Error::new(
                    io::ErrorKind::Other,
                    err
                )));
                Some(strval)
            }
        });
    }

    Ok(values)
}




trait ReadExt {
    fn read_u8(&mut self) -> io::Result<u8>;
    fn read_u8x4(&mut self) -> io::Result<[u8; 4]>;
    fn read_u8x2(&mut self) -> io::Result<[u8; 2]>;
    fn read_i32_be(&mut self) -> io::Result<i32>;
    fn read_u32_be(&mut self) -> io::Result<u32>;
    fn read_i16_be(&mut self) -> io::Result<i16>;
    fn read_u16_be(&mut self) -> io::Result<u16>;
    fn read_cstr(&mut self) -> io::Result<String>;
}

impl<R: Read> ReadExt for R {
    // fn read_exact(&mut self, buf: &mut [u8]) -> io::Result<()> {
    //     let mut nread = 0usize;
    //     while nread < buf.len() {
    //         match self.read(&mut buf[nread..]) {
    //             Ok(0) => return Err(io::Error::new(io::ErrorKind::Other,
    //                                                "unexpected EOF")),
    //             Ok(n) => nread += n,
    //             Err(ref e) if e.kind() == io::ErrorKind::Interrupted => {},
    //             Err(e) => return Err(e),
    //         }
    //     }
    //     Ok(())
    // }

    fn read_u8(&mut self) -> io::Result<u8> {
        let mut buf = [0u8; 1];
        try!(self.read_exact(&mut buf));
        Ok(buf[0])
    }

    fn read_u8x4(&mut self) -> io::Result<[u8; 4]> {
        let mut buf = [0u8; 4];
        try!(self.read_exact(&mut buf));
        Ok(buf)
    }

    fn read_u8x2(&mut self) -> io::Result<[u8; 2]> {
        let mut buf = [0u8; 2];
        try!(self.read_exact(&mut buf));
        Ok(buf)
    }

    fn read_i32_be(&mut self) -> io::Result<i32> {
        self.read_u8x4().map(|buf| i32::from_be(unsafe {
            mem::transmute(buf)
        }))
    }

    fn read_u32_be(&mut self) -> io::Result<u32> {
        self.read_u8x4().map(|buf| u32::from_be(unsafe {
            mem::transmute(buf)
        }))
    }

    fn read_i16_be(&mut self) -> io::Result<i16> {
        self.read_u8x2().map(|buf| i16::from_be(unsafe {
            mem::transmute(buf)
        }))
    }

    fn read_u16_be(&mut self) -> io::Result<u16> {
        self.read_u8x2().map(|buf| u16::from_be(unsafe {
            mem::transmute(buf)
        }))
    }

    fn read_cstr(&mut self) -> io::Result<String> {
        let mut buf = vec![];
        while let b @ 1 ... 255 = try!(self.read_u8()) {
            buf.push(b)
        }
        String::from_utf8(buf).map_err(|err| {
            io::Error::new(io::ErrorKind::Other, err)
        })
    }
}

#[cfg(test)]
mod test {
     use super::ReadExt;
     use std::io::Cursor;

    #[test]
    fn read_cstr() {
        let buf: &[u8] = b"some awesome\0";
        let mut reader = Cursor::new(buf);
        assert_eq!(reader.read_cstr().unwrap(), "some awesome".to_string());
    }

        #[test]
    fn read_without_terminating_zero() {
        let buf: &[u8] = b"some awesome";
        let mut reader = Cursor::new(buf);

        assert!(reader.read_cstr().is_err());
    }
}
