use std::io::{self, Read};

pub trait ReadAll: Read {
    fn read_all(&mut self, buf: &mut [u8]) -> io::Result<()> {
        let mut nread = 0usize;
        while nread < buf.len() {
            match self.read(&mut buf[nread..]) {
                Ok(0) => return Err(io::Error::new(io::ErrorKind::Other,
                    format!("unexpected EOF: {:?}", buf))),
                Ok(n) => nread += n,
                Err(ref e) if e.kind() == io::ErrorKind::Interrupted => {},
                Err(e) => return Err(e),
            }
        }
        Ok(())
    }

    fn read_u8(&mut self) -> io::Result<u8> {
        let mut buf = [0u8];
        try!(self.read_all(&mut buf));
        return Ok(buf[0]);
    }
}

impl<R: Read> ReadAll for R {

}
