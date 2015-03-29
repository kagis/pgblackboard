use std::io::{
    self,
    BufRead,
    Write
};

pub trait CStringReader {
    fn read_cstr(&mut self) -> io::Result<String>;
}

impl<T: BufRead> CStringReader for T {
    fn read_cstr(&mut self) -> io::Result<String> {
        let mut buf = vec![];
        try!(self.read_until(0, &mut buf));
        buf.pop();
        String::from_utf8(buf).map_err(|_| io::Error::new(
            io::ErrorKind::Other,
            "Received a non-utf8 string from server",
            None
        ))
    }
}

pub trait CStringWriter {
    fn write_cstr(&mut self, s: &str) -> io::Result<()>;
}

impl<T: Write> CStringWriter for T {
    fn write_cstr(&mut self, s: &str) -> io::Result<()> {
        try!(self.write_all(s.as_bytes()));
        self.write_all(&[0])
    }
}


pub fn cstr_len(s: &str) -> usize {
    s.len() + 1
}


#[cfg(test)]
mod test {
     use super::*;
     use std::io::Cursor;

    #[test]
    fn read_cstr() {
        let buf: &[u8] = b"some awesome\0";
        let mut reader = Cursor::new(buf);
        assert_eq!(reader.read_cstr(), Ok("some awesome".to_string()));
    }

    #[test]
    fn write_cstr() {
        let mut buf = vec![];
        buf.write_cstr("some awesome").unwrap();
        assert_eq!(&buf, b"some awesome\0");
    }
}
