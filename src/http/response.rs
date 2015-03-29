use std::net::TcpStream;
use std::io::{self, BufStream, Write};

/// http://www.w3.org/Protocols/rfc2616/rfc2616-sec6.html#sec6.1
#[derive(Debug, Copy)]
#[allow(dead_code)]
pub enum Status {
    Continue                     = 100,
    SwitchingProtocols           = 101,

    Ok                           = 200,
    Created                      = 201,
    Accepted                     = 202,
    NonAuthoritativeInformation  = 203,
    NoContent                    = 204,
    ResetContent                 = 205,
    PartialContent               = 206,

    MultipleChoices              = 300,
    MovedPermanently             = 301,
    Found                        = 302,
    SeeOther                     = 303,
    NotModified                  = 304,
    UseProxy                     = 305,
    TemporaryRedirect            = 307,

    BadRequest                   = 400,
    Unauthorized                 = 401,
    PaymentRequired              = 402,
    Forbidden                    = 403,
    NotFound                     = 404,
    MethodNotAllowed             = 405,
    NotAcceptable                = 406,
    ProxyAuthenticationRequired  = 407,
    RequestTimeout               = 408,
    Conflict                     = 409,
    Gone                         = 410,
    LengthRequired               = 411,
    PreconditionFailed           = 412,
    RequestEntityTooLarge        = 413,
    RequestUriTooLarge           = 414,
    UnsupportedMediaType         = 415,
    RequestedRangeNotSatisfiable = 416,
    ExpectationFailed            = 417,

    InternalServerError          = 500,
    NotImplemented               = 501,
    BadGateway                   = 502,
    ServiceUnavailable           = 503,
    GatewayTimeout               = 504,
    HttpVersionNotSupported      = 505,
}







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



struct ResponseWriter(BufStream<TcpStream>);

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

    pub fn write_chunk(&mut self, buf: &[u8]) -> io::Result<()> {
        if buf.is_empty() {
            return Ok(());
        }
        let inner = &mut self.0;
        try!(write!(inner, "{:x}\r\n", buf.len()));
        try!(inner.write_all(buf));
        inner.write_all(b"\r\n")
    }
}
