extern crate serialize;

use self::serialize::base64::FromBase64;

use std::io::{
    IoResult,
    BufferedStream,
    BufferedReader,
    ByRefReader,
    //ByRefWriter,

    IoError,
    OtherIoError,
    InvalidInput,

    Stream,
    Acceptor,
    Listener,
    TcpListener,
    TcpStream,
};

use std::ascii::AsciiExt;
use std::io::net::ip::ToSocketAddr;

//use std::thread::Thread;
use std::sync::{ TaskPool, Arc };
use std::fmt;
use std::str;




// pub struct Response<TBody> {
//     pub status: Status,
//     pub body: TBody,
// }

// pub trait Response: Iterator<Vec<u8>> {
//     fn get_status(&self) -> Status;
// }



#[derive(Show, Copy)]
pub enum Status {
    Ok           = 200,

    BadRequest   = 400,
    Unauthorized = 401,
    NotFound     = 404,
}

// impl fmt::String for Status {
//     fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
//         use self::Status::*;

//         write!(f, "{} {:?}", *self as u16, *self)
//     }
// }

pub enum AuthenticationScheme {
    Basic,
}

// pub struct ResponseHeaders {
//     pub www_authenticate: Option<AuthenticationScheme>,
//     pub content_type: Option<String>,
// }

pub struct Response<TWriter> where TWriter: Writer {
    writer: TWriter
}

impl<TWriter> Response<TWriter> where TWriter: Writer {
    fn new(writer: TWriter) -> Response<TWriter> {
        Response { writer: writer }
    }

    pub fn start(mut self, status: Status) -> IoResult<ResponseHeadersWriter<TWriter>> {
        try!(write!(&mut self.writer, "HTTP/1.1 {} {:?}\r\n", status as u16, status));
        let mut a = ResponseHeadersWriter(self.writer);
        try!(a.write_header("Connection", "close"));
        Ok(a)
    }

    pub fn start_ok(self) -> IoResult<ResponseHeadersWriter<TWriter>> {
        self.start(Status::Ok)
    }

    // pub fn start_chunked(mut self, status: Status, headers: &[(&str, &str)]) -> IoResult<ChunkedWriter<TWriter>> {
    //     try!(write!(&mut self.writer, "HTTP/1.1 {}\r\n", status));
    //     try!(self.writer.write_str("Connection: close\r\n"));
    //     try!(self.writer.write_str("Transfer-Encoding: chunked\r\n"));
    //     //try!(self.writer.write_str("Content-type: text/html; charset=utf-8\r\n"));

    //     for &(header_name, header_value) in headers.iter() {
    //         try!(write!(&mut self.writer, "{}: {}\r\n", header_value, header_name));
    //     }

    //     try!(self.writer.write(b"\r\n"));
    //     Ok(ChunkedWriter(self.writer))
    // }
}


struct ResponseHeadersWriter<T: Writer>(T);
impl<T: Writer> ResponseHeadersWriter<T> {
    pub fn write_header<TValue: fmt::String>(&mut self, name: &str, value: TValue) -> IoResult<&mut Self> {
        try!(write!(&mut self.0, "{}: {}\r\n", name, value));
        Ok(self)
    }

    pub fn write_www_authenticate(&mut self, auth_scheme: AuthenticationScheme) -> IoResult<&mut Self> {
        self.write_header("WWW-Authenticate", match auth_scheme {
            AuthenticationScheme::Basic => "Basic",
        })
    }

    pub fn write_content_type(&mut self, content_type: &str) -> IoResult<&mut Self> {
        self.write_header("Content-Type", content_type)
    }

    pub fn write_content(mut self, content: &[u8]) -> IoResult<()> {
        try!(self.write_header("Content-Length", content.len()));
        try!(self.0.write(b"\r\n"));
        self.0.write(content)
    }

    pub fn start_chunked_content(mut self) -> IoResult<ChunkedWriter<T>> {
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

fn malformed_request_line_err() -> IoError {
    IoError {
        kind: InvalidInput,
        desc: "Malformed request line.",
        detail: None,
    }
}









mod headers {
    use std::io::IoResult;
    use super::AuthenticationScheme;

    struct ResponseHeaders {
        buf: Vec<u8>
    }

    impl ResponseHeaders {
        fn new() -> ResponseHeaders {
            ResponseHeaders { buf: vec![] }
        }

        fn add<T: ResponseHeader>(&mut self, header: T) {
            self.buf.write_str(header.get_name()).unwrap();
            self.buf.write_str(": ").unwrap();
            header.get_value(&mut self.buf).unwrap();
            self.buf.write(b"\r\n").unwrap();
        }
    }


    trait ResponseHeader {
        fn get_name(&self) -> &'static str;
        fn get_value<TWriter: Writer>(&self, &mut TWriter) -> IoResult<()>;
    }

    pub struct WWWAuthenticate(AuthenticationScheme);

    impl ResponseHeader for WWWAuthenticate {
        fn get_name(&self) -> &'static str { "WWW-Authenticate" }

        fn get_value<TWriter: Writer>(&self, w: &mut TWriter) -> IoResult<()> {
            write!(w, "Basic")
        }
    }

    #[test]
    fn test_response_headers() {
        let mut headers = ResponseHeaders::new();
        headers.add(WWWAuthenticate(AuthenticationScheme::Basic));

        let content = String::from_utf8(headers.buf).unwrap();
        assert_eq!(content, "WWW-Authenticate: Basic\r\n");
    }
}




















#[derive(Show)]
pub enum RequestContent {
    UrlEncoded(Vec<(String, String)>),
    Binary(Vec<u8>),
}

#[derive(Show, Copy)]
pub enum Method {
    Get,
    Post,
}

pub struct Request {
    pub method: Method,
    pub path: String,
    pub query_string: Vec<(String, String)>,
    pub content: Option<RequestContent>,
    pub basic_auth: Option<(String, String)>,
}

impl Request {
    fn read_from<T: Buffer>(reader: &mut T) -> IoResult<Request> {
        let req_line = try!(reader.read_crlf_line());

        let left_space_pos = try!(req_line.find(' ')
                                .ok_or(malformed_request_line_err()));

        let right_space_pos = try!(req_line.rfind(' ')
                                .ok_or(malformed_request_line_err()));


        let method = match &req_line[0..left_space_pos] {
            "GET" => Method::Get,
            "POST" => Method::Post,
            unsupported => return Err(IoError {
                kind: OtherIoError,
                desc: "Unsupported method",
                detail: Some(format!("{}", unsupported))
            }),
        };

        let http_version = &req_line[(right_space_pos + 1)..];
        if http_version != "HTTP/1.1" && http_version != "HTTP/1.0" {
            return Err(IoError {
                kind: OtherIoError,
                desc: "Unsupported HTTP protocol version.",
                detail: Some(http_version.to_string())
            });
        }

        let path = req_line[(left_space_pos + 1)..right_space_pos].to_string();


        let mut content_length = 0us;
        let mut authorization = None;
        let mut is_urlenc_content = false;

        fn err_or_line_is_not_empty(line_res: &IoResult<String>) -> bool {
            match line_res {
                &Ok(ref line) => !line.is_empty(),
                &Err(..) => true,
            }
        }

        for line_res in CRLFLines(reader.by_ref()).take_while(err_or_line_is_not_empty) {
            let line = try!(line_res);
            let (header_name, header_value) = try!(parse_header(&line[]));
            match &header_name.to_ascii_lowercase()[] {
                "content-length" => {
                    content_length = try!(header_value.parse().ok_or(IoError {
                        kind: InvalidInput,
                        desc: "Malformed Content-length value.",
                        detail: Some(format!("got {}", header_value))
                    }));
                },
                "content-type" => {
                    is_urlenc_content = (header_value == "application/x-www-form-urlencoded");
                    //content_type = Some(header_value.to_string());
                },
                "authorization" => {
                    authorization = Some(try!(parse_authorization(header_value)));
                },
                _ => continue,
            };

            // println!("{} = {}",
            //     String::from_utf8(header_name).unwrap(),
            //     String::from_utf8(header_value).unwrap(),

            // );
        }

        let content = if content_length > 0 {
            let content = try!(reader.read_exact(content_length));
            Some(if is_urlenc_content {
                RequestContent::UrlEncoded(parse_qs(&content[]))
            } else {
                RequestContent::Binary(content)
            })
        } else {
            None
        };

        Ok(Request {
            method: method,
            path: path,
            query_string: vec![],
            content: content,
            basic_auth: authorization,
        })
    }
}


fn parse_authorization(header_value: &str) -> IoResult<(String, String)> {


    let colon_pos = try!(header_value.find(' ').ok_or(IoError {
        kind: InvalidInput,
        desc: "Malformed Authorization header.",
        detail: Some("Missing colon between auth scheme and credentials.".to_string()),
    }));

    let auth_scheme = &header_value[0..colon_pos];
    if auth_scheme != "Basic" {
        return Err(IoError {
            kind: OtherIoError,
            desc: "Unsupported authorization scheme",
            detail: Some(format!("{}", auth_scheme)),
        });
    }

    let cred_b64 = &header_value[(colon_pos + 1)..];
    let cred_bytes = try!(cred_b64.from_base64().map_err(|_| IoError {
        kind: InvalidInput,
        desc: "Malformed Authorization header.",
        detail: Some("Invalid base64.".to_string()),
    }));
    let cred = try!(String::from_utf8(cred_bytes).map_err(|_| IoError {
        kind: InvalidInput,
        desc: "Malformed Authorization header.",
        detail: Some("Invalid utf-8 credentials.".to_string()),
    }));

    Ok({
        let colon_pos = try!(cred.find(':').ok_or(IoError {
            kind: InvalidInput,
            desc: "Malformed Authorization credentials header.",
            detail: Some("Missing colon between username and password.".to_string()),
        }));

        let user = cred[0..colon_pos].to_string();
        let password = cred[(colon_pos + 1)..].to_string();
        (user, password)
    })
}


trait CRLFLineReader {
    fn read_crlf_line(&mut self) -> IoResult<String>;
}

impl<T: Reader> CRLFLineReader for T {
    fn read_crlf_line(&mut self) -> IoResult<String> {
        let mut line = vec![];
        loop {
            match try!(self.read_byte()) {
                b'\r' => {
                    let mustbe_lf = try!(self.read_byte());
                    if mustbe_lf != b'\n' {
                        return Err(invalid_line_ending());
                    }
                    return String::from_utf8(line).map_err(|_| IoError {
                        kind: OtherIoError,
                        desc: "Non ascii string",
                        detail: None
                    });
                },
                b'\n' => return Err(invalid_line_ending()),
                x => line.push(x),
            }
        }
    }
}

fn invalid_line_ending() -> IoError {
    IoError {
        kind: InvalidInput,
        desc: "Invalid line ending.",
        detail: None,
    }
}

struct CRLFLines<TReader>(TReader);

impl<T: CRLFLineReader> Iterator for CRLFLines<T> {
    type Item = IoResult<String>;

    fn next(&mut self) -> Option<IoResult<String>> {
        Some(self.0.read_crlf_line())
    }
}


// trait TokenReader {
//     fn read_token(&mut self, maxlen: uint) -> IoResult<Vec<u8>>;
// }

// impl<T: Reader> TokenReader for T {
//     fn read_token(&mut self, maxlen: uint) -> IoResult<Vec<u8>> {
//         self.bytes().take_while(|&x| is_token(x))
//     }
// }


/// https://github.com/hyperium/hyper/blob/2dd55d7ae06a7d4bd97c531baf4fb485a77f488e/src/http.rs#L331
// pub fn is_token(b: u8) -> bool {
//     match b {
//         b'a'...b'z' |
//         b'A'...b'Z' |
//         b'0'...b'9' |
//         b'!' |
//         b'#' |
//         b'$' |
//         b'%' |
//         b'&' |
//         b'\''|
//         b'*' |
//         b'+' |
//         b'-' |
//         b'.' |
//         b'^' |
//         b'_' |
//         b'`' |
//         b'|' |
//         b'~' => true,
//         _ => false
//     }
// }

// trait RequestReader: Buffer {
//     fn read_request(&mut self) -> IoResult<Request> {
//         let method = try!(self.read_method());

//         let mut path = try!(self.read_until(b' '));
//         path.pop();

//         let http_version = try!(self.read_until(b'\n'));

//         //println!("{} {} {}", method, path, http_version);

//         for header_result in HeaderIterator(self.by_ref()) {
//             let (header_name, header_value) = try!(header_result);
//             match header_name[].to_ascii_lowercase() {
//                 b"content-length" => {}
//             }

//             println!("{} = {}",
//                 String::from_utf8(header_name).unwrap(),
//                 String::from_utf8(header_value).unwrap(),

//             );
//         }

//         // loop {
//         //     let (header_name, header_value) = try!(self.read_header());
//         //     //line.pop(); // \n
//         //     //line.pop(); // \r

//         //     if line == "\r\n" {
//         //         //println!("breaked");
//         //         break;
//         //     }
//         //     //println!("{}", line.as_bytes());
//         // }

//         Ok(Request {
//             method: method,
//             path: path,
//             query_string: vec![],
//             content: vec![],
//             basic_auth: None,
//         })
//     }

//     fn read_until_sp(&mut self) -> IoResult<Vec<u8>> {
//         let mut buf = try!(self.read_until(b' '));
//         buf.pop();
//         Ok(buf)
//     }

//     fn read_method(&mut self) -> IoResult<Method> {
//         Ok(match try!(self.read_until_sp())[] {
//             b"GET" => Method::Get,
//             b"POST" => Method::Post,
//             _ => panic!("Unknown method"),
//         })
//     }
// }

// impl<T: Buffer> RequestReader for T { }


// struct HeaderIterator<TReader: Reader>(TReader);

// impl<T: Buffer> Iterator for HeaderIterator<T> {
//     type Item = IoResult<(Vec<u8>, Vec<u8>)>;

//     fn next(&mut self) -> Option<IoResult<(Vec<u8>, Vec<u8>)>> {
//         let reader = &mut self.0;
//         let line = match reader.read_until(b'\n') {
//             Ok(mut line) => {
//                 line.pop(); // \n
//                 if line.pop() != Some(b'\r') {
//                     return Some(Err(IoError {
//                         kind: InvalidInput,
//                         desc: "Invalid line ending.",
//                         detail: None,
//                     }));
//                 }
//                 line
//             },
//             Err(e) => return Some(Err(e)),
//         };

//         if line.is_empty() {
//             return None;
//         }


//     }
// }

fn parse_header(line: &str) -> IoResult<(&str, &str)> {
    let colon_pos = match line.find(':') {
        Some(pos) => pos,
        None => return Err(IoError {
            kind: InvalidInput,
            desc: "Malformed HTTP header.",
            detail: Some(format!("{}", line)),
        }),
    };

    let header_name = &line[0..colon_pos];
    let header_value = line[(colon_pos + 1)..].trim_left();

    Ok((header_name, header_value))
}



// fn handle_client<T>(stream: T) -> IoResult<()> where T: Stream {
//     let mut stream = BufferedStream::with_capacities(1024, 1024, stream);
//     let req = try!(stream.read_request());

//     //let mut stream = BufferedStream::new(stream);

//     //let line = try!(stream.read_until(b'\n'));
//     //let method = line.slice_to(line.find())



//     try!(stream.write_str("HTTP/1.1 200 OK\r\n"));
//     try!(stream.write_str("Transfer-Encoding: chunked\r\n"));
//     try!(stream.write_str("Connection: close\r\n"));
//     try!(stream.write_str("\r\n"));

//     // let mut body = ChunkedWriter(stream);

//     // try!(body.write(b"hello world"));
//     // try!(body.write(b""));

//     // try!(stream.write_str(format!("{:x}\r\n", 11i).as_slice()));
//     // try!(stream.write_str("hello world"));
//     // try!(stream.write_str("\r\n"));
//     // try!(stream.write_str("0\r\n\r\n"));
//     // try!(stream.flush());

//     Ok(())
// }


// trait HttpReader: Reader {


//     fn read_until(&mut self, terminator: u8) -> IoResult<Vec<u8>> {
//         let mut buf = vec![];

//         loop {
//             let b = try!(self.read_u8());
//             buf.push(b);
//             if b == terminator {
//                 return Ok(buf);
//             }
//         }
//     }
// }

//impl<T> HttpReader for T where T: Reader { }


pub fn serve_forever_tcp<TAddr, THandler>(addr: TAddr, handler: THandler)
    where TAddr: ToSocketAddr,
          THandler: Handler<TcpStream>
{
    let listener = TcpListener::bind(addr).unwrap();
    let acceptor = listener.listen().unwrap();
    serve_forever(acceptor, handler);
}



pub fn serve_forever<TStream, TAcceptor, THandler>(
    mut acceptor: TAcceptor,
    handler: THandler) where

    TStream: Stream + Send,
    TAcceptor: Acceptor<TStream>,
    THandler: Handler<TStream>
{


    let pool = TaskPool::new(10);

    let handler = Arc::new(handler);
    // accept connections and process them, spawning a new tasks for each one
    for stream_result in acceptor.incoming() {
        let handler = handler.clone();
        match stream_result {
            Err(e) => { println!("{}", e); }
            Ok(mut stream) => pool.execute(move || {
                let req = {
                    let mut reader = BufferedReader::with_capacity(1024, stream.by_ref());
                    Request::read_from(&mut reader).unwrap()
                };
                let res = Response::new(stream);
                handler.handle(req, res);
            })
        }
    }
}





/// A handler that can handle incoming requests for a server.
pub trait Handler<TWriter>: Sync + Send where TWriter: Writer {
    /// Receives a `Request`/`Response` pair, and should perform some action on them.
    ///
    /// This could reading from the request, and writing to the response.
    fn handle(&self, Request, Response<TWriter>);
}

impl<TFunc, TWriter> Handler<TWriter> for TFunc
    where TFunc: Fn(Request, Response<TWriter>),
          TFunc: Sync + Send,
          TWriter: Writer
{

    fn handle(&self, req: Request, res: Response<TWriter>) {
        (*self)(req, res)
    }
}



















fn parse_qs(input: &[u8]) -> Vec<(String, String)> {
    input.split(|&x| x == b'&')
        .map(parse_qs_param)
        .filter_map(|x| x)
        .collect()
}

fn parse_qs_param(param: &[u8]) -> Option<(String, String)> {
    let mut key_val_iter = param.splitn(2, |&x| x == b'=');
    let key = key_val_iter.next();
    let value = key_val_iter.next();
    match (key, value) {
        (Some(key), Some(value)) => Some((
            url_decode(key), url_decode(value)
        )),
        _ => None
    }
}

fn url_decode(input: &[u8]) -> String {
    let mut buf = Vec::with_capacity(input.len());
    let mut i = 0;
    while i < input.len() {
        let c = input[i];
        match c {
            b'%' if i + 2 < input.len() => {
                let maybe_h = from_hex(input[i + 1]);
                let maybe_l = from_hex(input[i + 2]);
                if let (Some(h), Some(l)) = (maybe_h, maybe_l) {
                    buf.push(h * 0x10 + l);
                    i += 2;
                }
            },
            b'+' => buf.push(b' '),
            c => buf.push(c),
        }
        i += 1;
    }
    String::from_utf8(buf).unwrap()
}

pub fn from_hex(byte: u8) -> Option<u8> {
    match byte {
        b'0' ... b'9' => Some(byte - b'0'),
        b'A' ... b'F' => Some(byte + 10 - b'A'),
        b'a' ... b'f' => Some(byte + 10 - b'a'),
        _ => None
    }
}

#[test]
fn test_parse_qs() {
    let qs = parse_qs(b"foo=value1&bar=value2");
    assert_eq!(qs, vec![
        ("foo".to_string(), "value1".to_string()),
        ("bar".to_string(), "value2".to_string())
    ]);
}

#[test]
fn test_url_decode() {
    assert_eq!(
        url_decode(b"%7Btest%7D+test"),
        "{test} test".to_string()
    );
}
