mod index;
mod sqlexec;
mod tree;
mod definitions;
mod tables;
mod statres;

use http;
use dbms;
use self::index::handle_index_req;
use self::sqlexec::handle_sqlexec_req;
use self::tree::handle_tree_req;
use self::definitions::handle_def_req;
use self::tables::handle_table_req;
use self::statres::FAVICON_RESOURCE;
use self::statres::BUNDLE_INDEX_RESOURCE;
use self::statres::BUNDLE_MAP_RESOURCE;

use rustc_serialize::{json, Encodable};
use std::io;


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
            ["tree", obj_path..] => handle_tree_req(&self.dbms, obj_path, req),
            ["definitions", obj_path..] => handle_def_req(&self.dbms, obj_path, req),
            ["tables", table_path..] => handle_table_req(&self.dbms, table_path, req),

            // static resources
            ["favicon.ico"] => FAVICON_RESOURCE.handle_http_req(&[], req),
            ["bundle-index.js"] => BUNDLE_INDEX_RESOURCE.handle_http_req(&[], req),
            ["bundle-map.js"] => BUNDLE_MAP_RESOURCE.handle_http_req(&[], req),

            _ => Box::new(index::ErrorResponse {
                status: http::Status::NotFound,
                message: "The requested URL was not found."
            })
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
