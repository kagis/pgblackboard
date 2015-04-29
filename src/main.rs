#![feature(plugin)]
#![feature(slice_patterns)]
#![feature(collections)]
#![feature(custom_attribute)]
#![plugin(regex_macros)]
#![feature(core)]

extern crate argparse;
extern crate regex;
extern crate rustc_serialize;
extern crate postgres as pg;
// extern crate http;
mod http;



mod sqlexec;
use sqlexec::SqlExecHandler;

mod webapi;
use webapi::DbDir;

mod index;
use index::IndexPage;

mod statres;
use statres::StaticResource;


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
            [""] => RootResource {
                pgaddr: self.pgaddr.clone(),
            }.handle_http_req(&[], req),

            ["databases", dbname, tail..] => DbDir {
                pgaddr: self.pgaddr.clone(),
                dbname: dbname.to_string()
            }.handle_http_req(tail, req),

            ["favicon.ico"] => StaticResource {
                content: include_bytes!("ui/favicon.ico"),
                content_type: "image/vnd.microsoft.icon",
                gzipped: false,
                etag: "a",
            }.handle_http_req(&[], req),

            ["bundle-index.js"] => StaticResource {
                content: include_bytes!(concat!(env!("OUT_DIR"), "/bundle-index.js.gz")),
                etag: include_str!(concat!(env!("OUT_DIR"), "/bundle-index.js.md5")),
                content_type: "application/javascript; charset=utf-8",
                gzipped: true
            }.handle_http_req(&[], req),

            ["bundle-map.js"] => StaticResource {
                content: include_bytes!(concat!(env!("OUT_DIR"), "/bundle-map.js.gz")),
                etag: include_str!(concat!(env!("OUT_DIR"), "/bundle-map.js.md5")),
                content_type: "application/javascript; charset=utf-8",
                gzipped: true
            }.handle_http_req(&[], req),

            _ => Box::new(index::ErrorResponse {
                status: http::Status::NotFound,
                message: "The requested URL was not found."
            })
        }
    }
}



struct RootResource {
    pgaddr: String
}

impl http::Resource for RootResource {
    fn get(&self, req: &http::Request) -> Box<http::Response> {
        use http::Handler;
        let handler = IndexPage {
            pgaddr: &self.pgaddr
        };
        handler.handle_http_req(&[], req)
    }

    fn post(&self, req: &http::Request) -> Box<http::Response> {
        use http::Handler;
        let handler = SqlExecHandler { pgaddr: &self.pgaddr };
        handler.handle_http_req(&[], req)
    }
}
