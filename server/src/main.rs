#![feature(plugin)]
#![feature(slice_patterns)]
#![feature(custom_attribute)]
#![feature(core)]
#![plugin(regex_macros)]

extern crate argparse;
extern crate regex;
extern crate rustc_serialize;
extern crate postgres as pg;
extern crate http;

mod index;
mod sqlexec;
mod webapi;
mod statres;

use std::io;


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
        pgaddr: pgaddr
    };

    http::serve_forever(&httpaddr, webapp).unwrap();
}

struct WebApplication {
    pub pgaddr: String
}

impl http::Handler for WebApplication {
    fn handle_http_req(&self,
                       path: &[&str],
                       req: &http::Request)
                       -> Box<http::Response>
    {
        match path {
            [""] => index::IndexPage {
                pgaddr: &self.pgaddr,
            }.handle_http_req(&[], req),

            ["exec"] => sqlexec::SqlExecEndpoint {
                pgaddr: &self.pgaddr
            }.handle_http_req(&[], req),

            ["databases", dbname, tail..] => webapi::DbDir {
                pgaddr: self.pgaddr.clone(),
                dbname: dbname.to_string()
            }.handle_http_req(tail, req),

            ["favicon.ico"] => statres::FAVICON_ICO.handle_http_req(&[], req),
            ["bundle-index.js"] => statres::BUNDLE_INDEX.handle_http_req(&[], req),
            ["bundle-map.js"] => statres::BUNDLE_MAP.handle_http_req(&[], req),

            _ => Box::new(index::ErrorResponse {
                status: http::Status::NotFound,
                message: "The requested URL was not found."
            })
        }
    }
}




