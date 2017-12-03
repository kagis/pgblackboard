use std::io::{ self, Write };
use std::mem;
use std::fmt::{ self, Debug };
#[derive(Debug)]
pub struct StartupMessage<'a, 'b> {
    pub user: &'a str,
    pub database: &'b str,
}

// #[derive(Debug)]
pub struct PasswordMessage<'a> {
    pub password: &'a str,
}

impl<'a> fmt::Debug for PasswordMessage<'a> {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "PasswordMessage {{ **** }}")
    }
}

#[derive(Debug)]
pub struct QueryMessage<'a> {
    pub query: &'a str,
}

#[derive(Debug)]
pub struct ParseMessage<'a, 'b> {
    pub stmt_name: &'a str,
    pub stmt_body: &'b str,
}

#[derive(Debug)]
pub struct BindMessage<'a, 'b, 'c> {
    pub portal_name: &'a str,
    pub stmt_name: &'b str,
    pub params: &'c[Option<&'c str>],
}

#[derive(Debug)]
pub struct ExecuteMessage<'a> {
    pub portal_name: &'a str,
    pub rowlimit: u32,
}

#[derive(Debug)]
pub struct DescribeStatementMessage<'a> {
    pub stmt_name: &'a str,
}

#[derive(Debug)]
pub struct CloseStatementMessage<'a> {
    pub stmt_name: &'a str,
}

#[derive(Debug)]
pub struct TerminateMessage;

#[derive(Debug)]
pub struct FlushMessage;

#[derive(Debug)]
pub struct SyncMessage;

#[derive(Debug)]
pub struct CancelRequestMessage {
    pub process_id: u32,
    pub secret_key: u32,
}

pub fn write_message<W: Write, M: FrontendMessage>(
    out: &mut W, msg: M)
    -> io::Result<()>
{
    let payload_len = {
        struct CountWriter { count: usize }

        impl Write for CountWriter {
            fn flush(&mut self) -> io::Result<()> { Ok(()) }
            fn write(&mut self, buf: &[u8]) -> io::Result<usize> {
                let buflen = buf.len();
                self.count += buflen;
                Ok(buflen)
            }
        }

        let mut count_writer = CountWriter { count: 0 };
        msg.write_payload(&mut count_writer).unwrap();
        count_writer.count
    };

    let msg_len = payload_len + mem::size_of::<i32>();

    if let Some(ident) = msg.ident() {
        try!(out.write_u8(ident));
    }

    out.write_i32_be(msg_len as i32)
        .and_then(|_| (msg.write_payload(out)))
        .and_then(|_| (out.flush()))
}

pub trait FrontendMessage: Debug {
    fn ident(&self) -> Option<u8> { None }
    fn write_payload<W: Write>(&self, out: &mut W) -> io::Result<()> { Ok(()) }
}

impl FrontendMessage for TerminateMessage {
    fn ident(&self) -> Option<u8> { Some(b'X') }
}

impl FrontendMessage for FlushMessage {
    fn ident(&self) -> Option<u8> { Some(b'H') }
}

impl FrontendMessage for SyncMessage {
    fn ident(&self) -> Option<u8> { Some(b'S') }
}

impl<'a, 'b> FrontendMessage for StartupMessage<'a, 'b> {
    fn write_payload<W: Write>(&self, out: &mut W) -> io::Result<()> {
        out.write_i32_be(0x0003_0000)
            .and_then(|_| (out.write_cstr("user")))
            .and_then(|_| (out.write_cstr(self.user)))
            .and_then(|_| (out.write_cstr("database")))
            .and_then(|_| (out.write_cstr(self.database)))
            .and_then(|_| (out.write_cstr("application_name")))
            .and_then(|_| (out.write_cstr("pgblackboard")))
            .and_then(|_| (out.write_u8(0)))
    }
}

impl<'a> FrontendMessage for PasswordMessage<'a> {
    fn ident(&self) -> Option<u8> { Some(b'p') }
    fn write_payload<W: Write>(&self, out: &mut W) -> io::Result<()> {
        out.write_cstr(self.password)
    }
}

impl<'a> FrontendMessage for QueryMessage<'a> {
    fn ident(&self) -> Option<u8> { Some(b'Q') }
    fn write_payload<W: Write>(&self, out: &mut W) -> io::Result<()> {
        out.write_cstr(self.query)
    }
}

impl<'a, 'b> FrontendMessage for ParseMessage<'a, 'b> {
    fn ident(&self) -> Option<u8> { Some(b'P') }
    fn write_payload<W: Write>(&self, out: &mut W) -> io::Result<()> {
        out.write_cstr(self.stmt_name)
            .and_then(|_| (out.write_cstr(self.stmt_body)))
            .and_then(|_| (out.write_i16_be(0)))
    }
}

impl<'a> FrontendMessage for DescribeStatementMessage<'a> {
    fn ident(&self) -> Option<u8> { Some(b'D') }
    fn write_payload<W: Write>(&self, out: &mut W) -> io::Result<()> {
        out.write_u8(b'S')
            .and_then(|_| (out.write_cstr(self.stmt_name)))
    }
}

impl<'a, 'b, 'c> FrontendMessage for BindMessage<'a, 'b, 'c> {
    fn ident(&self) -> Option<u8> { Some(b'B') }
    fn write_payload<W: Write>(&self, out: &mut W) -> io::Result<()> {
        out.write_cstr(self.portal_name)
            .and_then(|_| (out.write_cstr(self.stmt_name)))
            .and_then(|_| (out.write_i16_be(0)))
            .and_then(|_| (out.write_i16_be(self.params.len() as i16)))
            .and_then(|_| {
                for param in self.params {
                    try!(match *param {
                        None => out.write_i32_be(-1),
                        Some(val) => out.write_i32_be(val.len() as i32)
                                .and_then(|_| (out.write_all(val.as_bytes()))),
                    })
                }
                Ok(())
            })
            .and_then(|_| (out.write_i16_be(0)))
    }
}

impl<'a> FrontendMessage for ExecuteMessage<'a> {
    fn ident(&self) -> Option<u8> { Some(b'E') }
    fn write_payload<W: Write>(&self, out: &mut W) -> io::Result<()> {
        out.write_cstr(self.portal_name)
            .and_then(|_| (out.write_u32_be(self.rowlimit)))
    }
}

impl<'a> FrontendMessage for CloseStatementMessage<'a> {
    fn ident(&self) -> Option<u8> { Some(b'C') }
    fn write_payload<W: Write>(&self, out: &mut W) -> io::Result<()> {
        out.write_u8(b'S')
            .and_then(|_| (out.write_cstr(self.stmt_name)))
    }
}

impl FrontendMessage for CancelRequestMessage {
    fn write_payload<W: Write>(&self, out: &mut W) -> io::Result<()> {
        out.write_u32_be(16)
            .and_then(|_| out.write_u32_be(80877102))
            .and_then(|_| out.write_u32_be(self.process_id))
            .and_then(|_| out.write_u32_be(self.secret_key))
    }
}


trait WriteExt {
    fn write_i32_be(&mut self, i32) -> io::Result<()>;
    fn write_u32_be(&mut self, u32) -> io::Result<()>;
    fn write_i16_be(&mut self, i16) -> io::Result<()>;
    fn write_u8(&mut self, u8) -> io::Result<()>;
    fn write_cstr(&mut self, &str) -> io::Result<()>;
}

impl<W: Write> WriteExt for W {
    fn write_i32_be(&mut self, value: i32) -> io::Result<()> {
        self.write_all(& unsafe { mem::transmute::<_, [u8; 4]>(value.to_be()) })
    }

    fn write_u32_be(&mut self, value: u32) -> io::Result<()> {
        self.write_all(& unsafe { mem::transmute::<_, [u8; 4]>(value.to_be()) })
    }

    fn write_i16_be(&mut self, value: i16) -> io::Result<()> {
        self.write_all(& unsafe { mem::transmute::<_, [u8; 2]>(value.to_be()) })
    }

    fn write_u8(&mut self, value: u8) -> io::Result<()> {
        self.write_all(&[value])
    }

    fn write_cstr(&mut self, s: &str) -> io::Result<()> {
        self.write_all(s.as_bytes())
            .and_then(|_| (self.write_all(&[0])))
    }
}


#[cfg(test)]
mod test {
    use super::WriteExt;

    #[test]
    fn write_cstr() {
        let mut buf = vec![];
        buf.write_cstr("some awesome").unwrap();
        assert_eq!(&buf, b"some awesome\0");
    }
}
