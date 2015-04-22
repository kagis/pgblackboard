extern crate pgblackboard;

use pgblackboard::{
    serve_forever,
    WebApplication,
};

fn main() {
    let webapp = WebApplication {
        pgaddr: "localhost:5432".to_string(),
        index_template: include_str!(concat!(env!("OUT_DIR"), "/index.html")),
        index_bundle_js_gz: include_bytes!(concat!(env!("OUT_DIR"), "/bundle-index.js.gz")),
        favicon_ico: include_bytes!("../ui/favicon.ico"),
    };

    serve_forever("0.0.0.0:7890", webapp).unwrap();
}
