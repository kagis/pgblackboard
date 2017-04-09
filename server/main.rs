// #![feature(slice_patterns)]
// #![feature(iter_arith)]
// #![feature(read_exact)]
// #![feature(str_char)]

extern crate argparse;
extern crate rustc_serialize;
#[macro_use]
extern crate serde_json;
extern crate serde;
#[macro_use]
extern crate serde_derive;
// extern crate regex;

mod http;

#[cfg(feature = "uibuild")]
mod statres;

mod sqlexec;
mod postgres;
// mod sql;

use rustc_serialize::{json, Encodable};
use std::io;
use std::fs;
use std::path::{Path, PathBuf};



fn main() {
    let mut pgaddr = "127.0.0.1:5432".to_string();
    let mut httpaddr = "0.0.0.0:7890".to_string();

    {
        let mut ap = argparse::ArgumentParser::new();

        ap.set_description("pgBlackboard server.");

        ap.refer(&mut httpaddr).add_option(
            &["--http"],
            argparse::Store,
            "HOST:PORT to listen for HTTP requests. \
             Default is 0.0.0.0:7890");

        ap.refer(&mut pgaddr).add_option(
            &["--postgres"],
            argparse::Store,
            "HOST:PORT of PostgreSQL server. \
             Default is 127.0.0.1:5432");

        ap.parse_args_or_exit();
    }
    
    let webapp = WebApplication {
        pgaddr: pgaddr,
    };

    http::serve_forever(&httpaddr, webapp).unwrap();
}






pub struct WebApplication {
    pub pgaddr: String,
}

impl http::Handler for WebApplication {
    fn handle_http_req(
        &self,
        path: &[&str],
        req: &http::Request)
        -> Box<http::Response>
    {
        let path_prefix = path[0];
        let path_tail = &path[1..];
        
        if path_prefix == "exec" {
            return http::Handler::handle_http_req(
                &self::sqlexec::SqlExecEndpoint { pgaddr: self.pgaddr.clone() },
                path_tail,
                req
            );
        }

        #[cfg(feature = "uibuild")]
        match path_prefix {
            "" => statres::INDEX_HTML_RESOURCE.handle_http_req(&[], req),
            "favicon.ico" => statres::FAVICON_RESOURCE.handle_http_req(&[], req),
            _ => Box::new(GenericResponse {
                status: http::Status::NotFound,
                content_type: "text/html".to_owned(),
                content: b"not found".to_vec(),
            })
        }
        
        #[cfg(not(feature = "uibuild"))]
        match path_prefix {
            "" => FsDirHandler("./ui").handle_http_req(&["index.html"], req),
            _ => FsDirHandler("./ui").handle_http_req(path, req),
        }
    }
}
 

struct JsonResponse<T: Encodable> {
    status: http::Status,
    content: T,
}

impl<T: Encodable> http::Response for JsonResponse<T> {
    fn write_to(self: Box<Self>, w: http::ResponseStarter) -> io::Result<()> {
        let mut w = try!(w.start(self.status));
        try!(w.write_content_type("application/json"));
        w.write_content(json::encode(&self.content).unwrap().as_bytes())
    }
}
 
struct FsDirHandler(&'static str);

impl http::Handler for FsDirHandler {
    fn handle_http_req(
        &self,
        path: &[&str],
        req: &http::Request)
        -> Box<http::Response>
    {
        use std::io::Read;

        let mut pathbuf = PathBuf::from(self.0);
        pathbuf.extend(path);
        let content_type = match pathbuf.extension().and_then(|it| it.to_str()).unwrap_or("") {
            "ico" => "image/vnd.microsoft.icon",
            "svg" => "image/svg+xml",
            "js" => "application/javascript; charset=utf-8",
            "css" => "text/css; charset=utf-8",
            "html" => "text/html; charset=utf-8",
            _ => "application/octet-stream"
        };

        let mut content = vec![];
        let mut file = match fs::File::open(&pathbuf) {
            Ok(file) => file,
            Err(ref err) => match err.kind() {
                io::ErrorKind::NotFound => return Box::new(JsonResponse {
                    status: http::Status::NotFound,
                    content: "The requested URL was not found."
                }),
                _ => return Box::new(JsonResponse {
                    status: http::Status::InternalServerError,
                    content: format!("{}", err)
                }),
            }
        };
        file.read_to_end(&mut content).unwrap();

        Box::new(GenericResponse {
            status: http::Status::Ok,
            content_type: content_type.to_string(),
            content: content,
        })
    }
}

struct GenericResponse {
    status: http::Status,
    content_type: String,
    content: Vec<u8>,
}

impl http::Response for GenericResponse {
    fn write_to(self: Box<Self>, w: http::ResponseStarter) -> io::Result<()> {
        let mut w = try!(w.start(self.status));
        try!(w.write_content_type(&self.content_type));
        try!(w.write_content(&self.content));
        Ok(())
    }
}
