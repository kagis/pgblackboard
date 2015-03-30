#![feature(io)]
#![feature(collections)]

extern crate threadpool;
extern crate rustc_serialize;

mod readall;

use readall::{ReadAll};

pub use self::response::{
    ResponseStarter,
    Status,
};

use rustc_serialize::base64::FromBase64;
use threadpool::ThreadPool;

use std::io::{self, BufRead, BufStream, Read, Write};
use std::net::{TcpListener};
use std::ascii::AsciiExt;
use std::sync::{Arc};



mod response;
pub mod form;



pub enum AuthenticationScheme {
    Basic,
}

fn malformed_request_line_err() -> io::Error {
    io::Error::new(
        io::ErrorKind::InvalidInput,
        "Malformed request line.",
        None,
    )
}























#[derive(Debug, Clone)]
pub enum RequestContent {
    UrlEncoded(Vec<(String, String)>),
    Binary(Vec<u8>),
}

#[derive(Debug, Copy)]
pub enum Method {
    Get,
    Post,
    Patch,
}

impl ::std::fmt::Display for Method {
    fn fmt(&self, f: &mut ::std::fmt::Formatter) -> ::std::fmt::Result {
        write!(f, "{}", match *self {
            Method::Get => "GET",
            Method::Post => "POST",
            Method::Patch => "PATCH",
        })
    }
}

#[derive(Debug)]
pub struct Request {
    pub method: Method,
    pub path: Vec<String>,
    pub query_string: Vec<(String, String)>,
    pub content: Option<RequestContent>,
    pub basic_auth: Option<(String, String)>,
}

impl Request {
    fn read_from<T: BufRead>(reader: &mut T) -> io::Result<Request> {
        let req_line = try!(reader.read_crlf_line());

        let left_space_pos = try!(req_line.find(' ')
                                .ok_or(malformed_request_line_err()));

        let right_space_pos = try!(req_line.rfind(' ')
                                .ok_or(malformed_request_line_err()));


        let method = match &req_line[0..left_space_pos] {
            "GET" => Method::Get,
            "POST" => Method::Post,
            unsupported => return Err(io::Error::new(
                io::ErrorKind::Other,
                "Unsupported method",
                Some(format!("{}", unsupported))
            )),
        };

        let http_version = &req_line[(right_space_pos + 1)..];
        if http_version != "HTTP/1.1" && http_version != "HTTP/1.0" {
            return Err(io::Error::new(
                io::ErrorKind::Other,
                "Unsupported HTTP protocol version.",
                Some(http_version.to_string())
            ));
        }

        let url = req_line[(left_space_pos + 1)..right_space_pos].as_bytes();
        let (path, query_string) = match url.position_elem(&b'?') {
            Some(question_pos) => (
                &url[0..question_pos],
                parse_qs(&url[(question_pos + 1)..]),
            ),
            None => (url, vec![]),
        };


        let mut content_length = 0usize;
        let mut authorization = None;
        let mut is_urlenc_content = false;

        fn err_or_line_is_not_empty(line_res: &io::Result<String>) -> bool {
            match line_res {
                &Ok(ref line) => !line.is_empty(),
                &Err(..) => true,
            }
        }

        for line_res in CRLFLines(reader.by_ref()).take_while(err_or_line_is_not_empty) {
            let line = try!(line_res);
            let (header_name, header_value) = try!(parse_header(&line));
            match &header_name.to_ascii_lowercase()[..] {
                "content-length" => {
                    content_length = try!(header_value.parse().map_err(|_| io::Error::new(
                        io::ErrorKind::InvalidInput,
                        "Malformed Content-length value.",
                        Some(format!("got {}", header_value))
                    )));
                }
                "content-type" => {
                    is_urlenc_content = header_value == "application/x-www-form-urlencoded";
                    //content_type = Some(header_value.to_string());
                }
                "authorization" => {
                    authorization = Some(try!(parse_authorization(header_value)));
                }
                _ => continue,
            };

            // println!("{} = {}",
            //     String::from_utf8(header_name).unwrap(),
            //     String::from_utf8(header_value).unwrap(),

            // );
        }

        let content = if content_length > 0 {


            let mut content = Vec::with_capacity(content_length);
            content.extend((0..content_length).map(|_| 0));
            try!(reader.read_all(&mut content));

            Some(if is_urlenc_content {
                RequestContent::UrlEncoded(parse_qs(&content))
            } else {
                RequestContent::Binary(content)
            })
        } else {
            None
        };

        Ok(Request {
            method: method,
            path: path.split(|&x| x == b'/').skip(1).map(|x| url_decode(x)).collect(),
            query_string: query_string,
            content: content,
            basic_auth: authorization,
        })
    }
}


fn parse_authorization(header_value: &str) -> io::Result<(String, String)> {


    let colon_pos = try!(header_value.find(' ').ok_or(io::Error::new(
        io::ErrorKind::InvalidInput,
        "Malformed Authorization header.",
        Some("Missing colon between auth scheme and credentials.".to_string()),
    )));

    let auth_scheme = &header_value[0..colon_pos];
    if auth_scheme != "Basic" {
        return Err(io::Error::new(
            io::ErrorKind::Other,
            "Unsupported authorization scheme",
            Some(format!("{}", auth_scheme)),
        ));
    }

    let cred_b64 = &header_value[(colon_pos + 1)..];
    let cred_bytes = try!(cred_b64.from_base64().map_err(|_| io::Error::new(
        io::ErrorKind::InvalidInput,
        "Malformed Authorization header.",
        Some("Invalid base64.".to_string()),
    )));
    let cred = try!(String::from_utf8(cred_bytes).map_err(|_| io::Error::new(
        io::ErrorKind::InvalidInput,
        "Malformed Authorization header.",
        Some("Invalid utf-8 credentials.".to_string()),
    )));

    Ok({
        let colon_pos = try!(cred.find(':').ok_or(io::Error::new(
            io::ErrorKind::InvalidInput,
            "Malformed Authorization credentials header.",
            Some("Missing colon between username and password.".to_string()),
        )));

        let user = cred[..colon_pos].to_string();
        let password = cred[(colon_pos + 1)..].to_string();
        (user, password)
    })
}


trait CRLFLineReader {
    fn read_crlf_line(&mut self) -> io::Result<String>;
}

impl<T: Read> CRLFLineReader for T {
    fn read_crlf_line(&mut self) -> io::Result<String> {
        let mut line = vec![];
        loop {
            match try!(self.read_u8()) {
                b'\r' => {
                    let mustbe_lf = try!(self.read_u8());
                    if mustbe_lf != b'\n' {
                        return Err(invalid_line_ending());
                    }
                    return String::from_utf8(line).map_err(|_| io::Error::new(
                        io::ErrorKind::Other,
                        "Non ascii string",
                        None
                    ));
                },
                b'\n' => return Err(invalid_line_ending()),
                x => line.push(x),
            }
        }
    }
}

fn invalid_line_ending() -> io::Error {
    io::Error::new(
        io::ErrorKind::InvalidInput,
        "Invalid line ending.",
        None,
    )
}

struct CRLFLines<TReader>(TReader);

impl<T: CRLFLineReader> Iterator for CRLFLines<T> {
    type Item = io::Result<String>;

    fn next(&mut self) -> Option<io::Result<String>> {
        Some(self.0.read_crlf_line())
    }
}


// trait TokenReader {
//     fn read_token(&mut self, maxlen: uint) -> io::Result<Vec<u8>>;
// }

// impl<T: Reader> TokenReader for T {
//     fn read_token(&mut self, maxlen: uint) -> io::Result<Vec<u8>> {
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
//     fn read_request(&mut self) -> io::Result<Request> {
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

//     fn read_until_sp(&mut self) -> io::Result<Vec<u8>> {
//         let mut buf = try!(self.read_until(b' '));
//         buf.pop();
//         Ok(buf)
//     }

//     fn read_method(&mut self) -> io::Result<Method> {
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
//     type Item = io::Result<(Vec<u8>, Vec<u8>)>;

//     fn next(&mut self) -> Option<io::Result<(Vec<u8>, Vec<u8>)>> {
//         let reader = &mut self.0;
//         let line = match reader.read_until(b'\n') {
//             Ok(mut line) => {
//                 line.pop(); // \n
//                 if line.pop() != Some(b'\r') {
//                     return Some(Err(io::Error::new {
//                         kind: io::ErrorKind::InvalidInput,
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

fn parse_header(line: &str) -> io::Result<(&str, &str)> {
    let colon_pos = match line.find(':') {
        Some(pos) => pos,
        None => return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "Malformed HTTP header.",
            Some(format!("{}", line)),
        )),
    };

    let header_name = &line[0..colon_pos];
    let header_value = line[(colon_pos + 1)..].trim_left();

    Ok((header_name, header_value))
}



pub fn serve_forever<THandler>(addr: &str, handler: THandler) -> io::Result<()>
    where THandler: Fn(Request, ResponseStarter) -> io::Result<()>,
          THandler: Sync + Send,
          THandler: 'static
{
    let listener = try!(TcpListener::bind(addr));

    let pool = ThreadPool::new(10);
    let handler = Arc::new(handler);

    for stream_result in listener.incoming() {
        let handler = handler.clone();
        match stream_result {
            Err(e) => { println!("{}", e); }
            Ok(stream) => pool.execute(move || {
                let mut buf_stream = BufStream::with_capacities(/*read*/1024,
                                                                /*write*/64 * 1024,
                                                                stream);

                let req = Request::read_from(&mut buf_stream).unwrap();

                println!("{user} {method} {path:?}",
                         method=req.method,
                         path=req.path,
                         user=req.basic_auth
                                 .as_ref()
                                 .map_or("", |x| &x.0));

                let res = ResponseStarter(buf_stream);
                let handle_res = handler(req, res);

                if let Err(e) = handle_res {
                    println!("error while sending response {}", e);
                }
            })
        }
    }

    Ok(())
}





/// A handler that can handle incoming requests for a server.
pub trait Handler: Sync + Send {
    /// Receives a `Request`/`Response` pair, and should perform some action on them.
    ///
    /// This could reading from the request, and writing to the response.
    fn handle(&self, Request, ResponseStarter) -> io::Result<()>;
}

impl<TFunc> Handler for TFunc
    where TFunc: Fn(Request, ResponseStarter) -> io::Result<()>,
          TFunc: Sync + Send
{

    fn handle(&self, req: Request, res: ResponseStarter) -> io::Result<()> {
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
