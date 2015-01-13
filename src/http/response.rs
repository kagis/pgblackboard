
/// http://www.w3.org/Protocols/rfc2616/rfc2616-sec6.html#sec6.1
#[derive(Show, Copy)]
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

    Custom {
        code: u16,
        phrase: &'static str
    },
}

// pub enum AuthenticationChallenge {
//     Basic { realm: String },
// }


trait ResponseStarter {
    type TResponseWriter: ResponseWriter;

    fn start(mut self, Status) -> IoResult<TResponseWriter>;

    fn start_ok(self) -> IoResult<TResponseWriter> {
        self.start(self, Status::Ok)
    }
}

trait ResponseWriter {
    type TChunkedWriter: Writer;

    fn write_header<T: fmt::String>(&mut self, &str, T) -> IoResult<&mut Self>;
    fn write_content(mut self, &[u8]) -> IoResult<()>;
    fn start_chunked(mut self) -> IoResult<TChunkedWriter>;

    fn write_www_authenticate_basic(&mut self, realm: &str) -> IoResult<&mut Self> {
        self.write_header("WWW-Authenticate", BasicAuthChallengeFmt(realm))
    }

    fn write_content_type(&mut self, content_type: &str) -> IoResult<&mut Self> {
        self.write_header("Content-Type", content_type)
    }
}

struct BasicAuthChallengeFmt<'a>(&'a str);

impl<'a> ::std::fmt::String for BasicAuthChallengeFmt<'a> {
    fn fmt(&self, f: &mut ::std::fmt::Formatter) -> ::std::fmt::Result {
        write!(f, "Basic realm=\"{}\"", self.0)
    }
}





pub struct ResponseStarterImpl<T: Writer>(pub T);

impl<T: Writer> ResponseStarterImpl<T> for ResponseStarter {
    type TResponseWriter = ResponseWriterImpl;

    fn start(mut self, status: Status) -> IoResult<ResponseWriterImpl<T>> {
        try!(match status {
            Status::Custom { code, phrase } => write!(&mut self.writer, "HTTP/1.1 {} {}\r\n", code, phrase)),
            known => write!(&mut self.writer, "HTTP/1.1 {} {:?}\r\n", known as u16, known)),
        });
        try!(write!(&mut self.writer, "HTTP/1.1 {} {:?}\r\n", status as u16, status));
        let mut resp_writer = ResponseWriterImpl(self.writer);
        try!(resp_writer.write_header("Connection", "close"));
        Ok(resp_writer)
    }
}



struct ResponseWriterImpl<T: Writer>(T);

impl<T: Writer> ResponseWriterImpl<T> for ResponseWriter {
    type TChunkedWriter: ChunkedWriter<T>;

    fn write_header<T: fmt::String>(&mut self, name: &str, value: T) -> IoResult<&mut Self> {
        try!(write!(&mut self.0, "{}: {}\r\n", name, value));
        Ok(self)
    }

    fn write_content(mut self, content: &[u8]) -> IoResult<()> {
        try!(self.write_header("Content-Length", content.len()));
        try!(self.0.write(b"\r\n"));
        self.0.write(content)
    }

    fn start_chunked_content(mut self) -> IoResult<ChunkedWriter<T>> {
        try!(self.write_header("Transfer-Encoding", "chunked"));
        try!(self.0.write(b"\r\n"));
        Ok(ChunkedWriter(self.0))
    }
}


struct ChunkedWriter<T: Writer>(T);

impl<T: Writer> ChunkedWriter<T> {
    pub fn end(&mut self) -> IoResult<()> {
        self.0.write(b"0\r\n\r\n")
    }
}

impl<T: Writer> Writer for ChunkedWriter<T> {
    fn write(&mut self, buf: &[u8]) -> IoResult<()> {
        if buf.is_empty() {
            return Ok(());
        }
        let inner = &mut self.0;
        try!(write!(inner, "{:x}\r\n", buf.len()));
        try!(inner.write(buf));
        inner.write(b"\r\n")
    }
}
