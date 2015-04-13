use std::net::TcpStream;
use std::io::{self, BufStream, Write};

use status::Status;




pub struct ResponseStarter(pub BufStream<TcpStream>);

impl ResponseStarter {
    pub fn start(mut self, status: Status) -> io::Result<ResponseWriter> {
        try!(write!(&mut self.0,
                    "HTTP/1.1 {} {:?}\r\n",
                    status as u16,
                    status));

        let mut resp_writer = ResponseWriter(self.0);
        try!(resp_writer.write_header("Connection", "close"));
        Ok(resp_writer)
    }

    pub fn start_ok(self) -> io::Result<ResponseWriter> {
        self.start(Status::Ok)
    }
}



pub struct ResponseWriter(BufStream<TcpStream>);

impl ResponseWriter {
    pub fn write_header<TVal: ::std::fmt::Display>(&mut self, name: &str, value: TVal) -> io::Result<&mut Self> {
        try!(write!(&mut self.0, "{}: {}\r\n", name, value));
        Ok(self)
    }

    pub fn write_content(mut self, content: &[u8]) -> io::Result<()> {
        try!(self.write_header("Content-Length", content.len()));
        try!(self.0.write_all(b"\r\n"));
        self.0.write_all(content)
    }

    pub fn start_chunked(mut self) -> io::Result<ChunkedWriter> {
        try!(self.write_header("Transfer-Encoding", "chunked"));
        try!(self.0.write_all(b"\r\n"));
        Ok(ChunkedWriter(self.0))
    }

    pub fn write_www_authenticate_basic(&mut self, realm: &str) -> io::Result<&mut Self> {
        struct BasicAuthChallengeFmt<'a>(&'a str);

        impl<'a> ::std::fmt::Display for BasicAuthChallengeFmt<'a> {
            fn fmt(&self, f: &mut ::std::fmt::Formatter) -> ::std::fmt::Result {
                write!(f, "Basic realm=\"{}\"", self.0)
            }
        }

        try!(self.write_header("WWW-Authenticate", BasicAuthChallengeFmt(realm)));
        Ok(self)
    }

    pub fn write_content_type(&mut self, content_type: &str) -> io::Result<&mut Self> {
        try!(self.write_header("Content-Type", content_type));
        Ok(self)
    }
}


struct ChunkedWriter(BufStream<TcpStream>);

impl ChunkedWriter {
    pub fn end(&mut self) -> io::Result<()> {
        self.0.write_all(b"0\r\n\r\n")
    }

}

impl Write for ChunkedWriter {
    fn write(&mut self, buf: &[u8]) -> io::Result<usize> {
        if buf.is_empty() {
            return Ok(0);
        }
        let inner = &mut self.0;
        try!(write!(inner, "{:x}\r\n", buf.len()));
        try!(inner.write_all(buf));
        try!(inner.write_all(b"\r\n"));
        Ok(buf.len())
    }

    fn flush(&mut self) -> io::Result<()> {
        self.0.flush()
    }
}
