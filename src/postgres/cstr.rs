use std::io::{
    IoResult,
    IoError,
    OtherIoError,
    Buffer,
};

pub trait CStringReader {
    fn read_cstr(&mut self) -> IoResult<String>;
}

impl<TBuffer: Buffer> CStringReader for TBuffer {
    fn read_cstr(&mut self) -> IoResult<String> {
        let mut buf = try!(self.read_until(0));
        buf.pop();
        String::from_utf8(buf).map_err(|_| IoError {
            kind: OtherIoError,
            desc: "Received a non-utf8 string from server",
            detail: None
        })
    }
}

pub trait CStringWriter {
    fn write_cstr(&mut self, s: &str) -> IoResult<()>;
}

impl<T> CStringWriter for T where T: Writer {
    fn write_cstr(&mut self, s: &str) -> IoResult<()> {
        try!(self.write_str(s));
        self.write_u8(0)
    }
}


pub fn cstr_len(s: &str) -> usize {
    s.len() + 1
}


