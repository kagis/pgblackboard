mod index;
mod sqlexec;
mod webapi;
mod statres;

use http;
use dbms::Dbms;
use self::index::handle_index_req;
use self::sqlexec::handle_sqlexec_req;
use self::webapi::handle_dbdir_req;
use self::statres::{
    FAVICON_RESOURCE,
    BUNDLE_INDEX_RESOURCE,
    BUNDLE_MAP_RESOURCE,
};


pub struct WebApplication<TDbms: Dbms> {
    pub dbms: TDbms
}

impl<TDbms: Dbms> http::Handler for WebApplication<TDbms> {
    fn handle_http_req(
        &self, path: &[&str],
        req: &http::Request)
        -> Box<http::Response>
    {
        match path {
            [""] => handle_index_req(&self.dbms, req),
            ["exec"] => handle_sqlexec_req(&self.dbms, req),
            ["databases", db, tail..] => handle_dbdir_req(&self.dbms, db, tail, req),

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
