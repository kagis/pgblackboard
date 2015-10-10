mod index;
// mod sqlexec;
mod webapi;
mod statres;

use http;
use dbms::Dbms;
use self::index::IndexResource;
use self::statres::{ FAVICON_RESOURCE, BUNDLE_INDEX_RESOURCE, BUNDLE_MAP_RESOURCE };
use self::webapi::DbDir;


pub struct WebApplication<TDbms: Dbms> {
    pub dbms: TDbms
}

impl<TDbms: Dbms> http::Handler for WebApplication<TDbms> {
    fn handle_http_req(&self, path: &[&str], req: &http::Request) -> Box<http::Response> {
        match path {
            [""] => IndexResource {
                dbms: &self.dbms
            }.handle_http_req(&[], req),

            // ["exec"] => sqlexec::SqlExecEndpoint {
            //     pgaddr: &self.pgaddr
            // }.handle_http_req(&[], req),

            ["databases", dbname, tail..] => DbDir {
                dbms: &self.dbms,
                dbname: dbname.to_string()
            }.handle_http_req(tail, req),

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
