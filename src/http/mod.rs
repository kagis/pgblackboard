#![feature(io)]
#![feature(collections)]
#![feature(custom_attribute)]

extern crate threadpool;
extern crate rustc_serialize;

mod readall;
mod method;
mod reqerror;
mod status;
mod grammar;
mod response;
pub mod form;

pub use method::Method;
pub use status::Status;
pub use response::ResponseStarter;

use rustc_serialize::base64::FromBase64;
use rustc_serialize::json;
use threadpool::ThreadPool;

use std::io::{self, BufRead, BufStream, Read, Write};
use std::net::{TcpListener};
use std::ascii::AsciiExt;
use std::sync::{Arc};
use readall::{ReadAll};





pub trait Response {
    fn write_to(self: Box<Self>, ResponseStarter) -> io::Result<()>;
}

// impl Response for Status {
//     fn write_to(self: Box<Self>, w: ResponseStarter) -> io::Result<()> {

//         #[RustcEncodable]
//         struct Content { error: String }

//         let status = *self;
//         let mut w = try!(w.start(status));
//         try!(w.write_content_type("application/json"));
//         let content = Content { error: format!("{}", status) };
//         w.write_content(json::encode(&content).unwrap().as_bytes());
//     }
// }

pub trait Handler {
    fn handle_http_req(&self, &Request) -> Box<Response>;
}

pub trait Resource {
    fn get(&self, req: &Request) -> Box<Response> {
        self.method_not_allowed(req)
    }

    fn post(&self, req: &Request) -> Box<Response> {
        self.method_not_allowed(req)
    }

    fn patch(&self, req: &Request) -> Box<Response> {
        self.method_not_allowed(req)
    }

    fn method_not_allowed(&self, req: &Request) -> Box<Response> {
        struct MethodNotAllowed;

        impl Response for MethodNotAllowed {
            fn write_to(self: Box<Self>, w: ResponseStarter) -> io::Result<()> {
                let mut w = try!(w.start(Status::MethodNotAllowed));
                try!(w.write_content_type("application/json"));
                w.write_content(stringify!({
                    "error": "Method not allowed."
                }).as_bytes())
            }
        }

        Box::new(MethodNotAllowed)
    }
}

impl<R: Resource> Handler for R {
    fn handle_http_req(&self, req: &Request) -> Box<Response> {
        match req.method {
            Method::Get => self.get(req),
            Method::Post => self.post(req),
            Method::Patch => self.patch(req),
            _ => self.method_not_allowed(req),
        }
    }
}




fn malformed_request_line_err() -> io::Error {
    io::Error::new(
        io::ErrorKind::Other,
        "Malformed request line."
    )
}























#[derive(Debug, Clone)]
pub enum RequestContent {
    UrlEncoded(Vec<(String, String)>),
    Binary(Vec<u8>),
}





#[derive(Debug)]
pub struct Request {
    pub method: Method,
    pub path: Vec<String>,
    pub query_string: Vec<(String, String)>,
    pub content: Option<RequestContent>,
    pub credentials: Option<RequestCredentials>,
}



#[derive(Debug)]
pub enum RequestCredentials {
    Basic {
        username: String,
        password: String,
    }
}

impl Request {
    fn read_from<T: BufRead>(reader: &mut T) -> io::Result<Request> {
        let req_line = try!(reader.read_crlf_line());

        let left_space_pos = try!(req_line.find(' ')
                                .ok_or(malformed_request_line_err()));

        let right_space_pos = try!(req_line.rfind(' ')
                                .ok_or(malformed_request_line_err()));


        let method = req_line[0..left_space_pos].parse::<Method>().unwrap();

        let http_version = &req_line[(right_space_pos + 1)..];
        if http_version != "HTTP/1.1" && http_version != "HTTP/1.0" {
            return Err(io::Error::new(
                io::ErrorKind::Other,
                "Unsupported HTTP version.",
                // Some(http_version.to_string())
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
                        io::ErrorKind::Other,
                        "Malformed Content-length value.",
                        // Some(format!("got {}", header_value))
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
            credentials: None,
            //basic_auth: authorization,
        })
    }
}


fn parse_authorization(header_value: &str) -> io::Result<(String, String)> {


    let colon_pos = try!(header_value.find(' ').ok_or(io::Error::new(
        io::ErrorKind::Other,
        "Missing colon between auth scheme and credentials."
    )));

    let auth_scheme = &header_value[0..colon_pos];
    if auth_scheme != "Basic" {
        return Err(io::Error::new(
            io::ErrorKind::Other,
            "Unsupported authorization scheme",
            // Some(format!("{}", auth_scheme)),
        ));
    }

    let cred_b64 = &header_value[(colon_pos + 1)..];
    let cred_bytes = try!(cred_b64.from_base64().map_err(|_| io::Error::new(
        io::ErrorKind::Other,
        "Malformed Authorization header: Invalid base64."
    )));
    let cred = try!(String::from_utf8(cred_bytes).map_err(|_| io::Error::new(
        io::ErrorKind::Other,
        "Malformed Authorization header: Invalid utf-8 credentials."
    )));

    Ok({
        let colon_pos = try!(cred.find(':').ok_or(io::Error::new(
            io::ErrorKind::Other,
            "Missing colon between username and password."
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
                        "Non ascii string"
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
        io::ErrorKind::Other,
        "Invalid line ending."
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
            "Malformed HTTP header."/*,
            Some(format!("{}", line)),*/
        )),
    };

    let header_name = &line[0..colon_pos];
    let header_value = line[(colon_pos + 1)..].trim_left();

    Ok((header_name, header_value))
}



pub fn serve_forever<H>(addr: &str, handler: H) -> io::Result<()>
    where H: Handler + Send + Sync + 'static
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
                         user="user" /*req.credentials
                                 .as_ref()
                                 .map_or("", |x| &x.0)*/);

                let resp = handler.handle_http_req(&req);
                let resp_result = resp.write_to(ResponseStarter(buf_stream));
                if let Err(e) = resp_result {
                    println!("error while sending response {}", e);
                }
            })
        }
    }

    Ok(())
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

fn from_hex(byte: u8) -> Option<u8> {
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

// #[test]
// fn test_olo() {



//     struct WebApp {
//         message: String
//     }

//     impl Resource for WebApp {

//     }

//     let webapp = WebApp { message: "hello world".to_string() };

//     serve_forever("0.0.0.0:7890", webapp);
// }
