// #![feature(slice_patterns)]
// #![feature(iter_arith)]
// #![feature(read_exact)]
// #![feature(str_char)]

extern crate argparse;
extern crate rustc_serialize;

mod http;
mod dbms;
mod webapp;
mod postgres;

use self::postgres::PgDbms;
use self::webapp::WebApplication;


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

    let dbms = PgDbms {
        addr: pgaddr
    };

    let webapp = WebApplication {
        dbms: dbms
    };

    http::serve_forever(&httpaddr, webapp).unwrap();
}
