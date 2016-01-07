mod index;
mod sqlexec;
mod tree;
mod definitions;
mod tables;
mod ui;

#[cfg(not(debug_assertions))]
mod statres;

use http;
use dbms;
use self::index::handle_index_req;
use self::sqlexec::handle_sqlexec_req;
use self::tree::handle_tree_req;
use self::tree::handle_tree_root_req;
use self::definitions::handle_def_req;
use self::tables::handle_table_req;

use rustc_serialize::{json, Encodable};
use std::io;
use std::fs;
use std::path::{Path, PathBuf};


pub struct WebApplication<TDbms: dbms::Dbms> {
    pub dbms: TDbms
}

impl<TDbms: dbms::Dbms> http::Handler for WebApplication<TDbms> {
    fn handle_http_req(
        &self, path: &[&str],
        req: &http::Request)
        -> Box<http::Response>
    {
        match path {
            [""] => handle_index_req(&self.dbms, req),
            ["exec"] => handle_sqlexec_req(&self.dbms, req),
            ["tree"] => handle_tree_root_req(&self.dbms, req),
            ["tree", obj_path..] => handle_tree_req(&self.dbms, obj_path, req),
            ["definitions", obj_path..] => handle_def_req(&self.dbms, obj_path, req),
            ["tables", table_path..] => handle_table_req(&self.dbms, table_path, req),

            #[cfg(not(debug_assertions))]
            ["favicon.ico"] => statres::FAVICON_RESOURCE.handle_http_req(&[], req),

            #[cfg(not(debug_assertions))]
            ["pgblackboard.js"] => statres::BUNDLE_INDEX_RESOURCE.handle_http_req(&[], req),

            #[cfg(debug_assertions)]
            ["node_modules", asset_path..] => FsDirHandler("./node_modules").handle_http_req(asset_path, req),

            #[cfg(debug_assertions)]
            asset_path => FsDirHandler("./ui").handle_http_req(asset_path, req),


            // _ => Box::new(index::ErrorResponse {
            //     status: http::Status::NotFound,
            //     message: "The requested URL was not found."
            // })
        }
    }
}

fn get_req_credentials(
    req: &http::Request)
    -> Result<(&str, &str), Box<http::Response>>
{
    match req.credentials.as_ref() {
        Some(&http::RequestCredentials::Basic { ref user, ref passwd }) => {
            Ok((&user[..], &passwd[..]))
        }
        // Some(..) => return Box::new(JsonResponse {
        //     status: Unauthorized,
        //     content: "Unsupported authentication scheme"
        // }),
        None => return Err(Box::new(JsonResponse {
            status: http::Status::Unauthorized,
            content: "Username and password requried.",
        }))
    }
}

fn error_response(err: &dbms::Error) -> Box<http::Response> {
    Box::new(JsonResponse {
        content: err.message.clone(),
        status: match err.kind {
            dbms::ErrorKind::InvalidCredentials => http::Status::Unauthorized,
            dbms::ErrorKind::UnexistingPath => http::Status::NotFound,
            dbms::ErrorKind::UnexistingRow => http::Status::Conflict,
            dbms::ErrorKind::AmbiguousKey => http::Status::Conflict,
            dbms::ErrorKind::InvalidInput { .. } => http::Status::BadRequest,
            dbms::ErrorKind::InternalError => http::Status::InternalServerError,
        },
    })
}

struct JsonResponse<T: Encodable> {
    status: http::Status,
    content: T,
}

impl<T: Encodable> http::Response for JsonResponse<T> {
    fn write_to(self: Box<Self>, w: http::ResponseStarter) -> io::Result<()> {
        let mut w = try!(w.start(self.status));
        try!(w.write_content_type("application/json"));
        if self.status == http::Status::Unauthorized {
            try!(w.write_www_authenticate_basic("postgres"));
        }
        w.write_content(json::encode(&self.content).unwrap().as_bytes())
    }
}

struct JsonpResponse<T: Encodable> {
    status: http::Status,
    content: T,
    callback: String,
}

impl<T: Encodable> http::Response for JsonpResponse<T> {
    fn write_to(self: Box<Self>, w: http::ResponseStarter) -> io::Result<()> {
        let mut w = try!(w.start(self.status));
        try!(w.write_content_type("application/javascript"));
        if self.status == http::Status::Unauthorized {
            try!(w.write_www_authenticate_basic("postgres"));
        }

        let response_body = format!(
            "{callback}({arg})",
            callback = self.callback,
            arg = json::encode(&self.content).unwrap()
        );

        w.write_content(response_body.as_bytes())
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
                io::ErrorKind::NotFound => return Box::new(index::ErrorResponse {
                    status: http::Status::NotFound,
                    message: "The requested URL was not found."
                }),
                _ => return Box::new(index::ErrorResponse {
                    status: http::Status::InternalServerError,
                    message: format!("{}", err)
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
