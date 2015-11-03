extern crate ui;

use std::io;
use std::io::Write;
use std::collections::BTreeMap;
use rustc_serialize::json;
use http;
use dbms;
use std::fmt::Display;




pub fn handle_index_req<TDbms: dbms::Dbms>(
    dbms: &TDbms,
    req: &http::Request)
    -> Box<http::Response>
{
    http::Handler::handle_http_req(
        &IndexResource { dbms: dbms },
        &[],
        req,
    )
}

pub struct IndexResource<'dbms, TDbms: dbms::Dbms + 'dbms> {
    pub dbms: &'dbms TDbms
}

impl<'dbms, TDbms: dbms::Dbms + 'dbms> http::Resource for IndexResource<'dbms, TDbms> {
    fn get(&self, req: &http::Request) -> Box<http::Response> {

        use http::RequestCredentials::Basic;
        use http::Status::{
            NotFound,
            Unauthorized,
            InternalServerError,
        };

        let credentials = match req.credentials.as_ref() {
            Some(&Basic { ref user, ref passwd }) => (&user[..], &passwd[..]),
            // Some(..) => return Box::new(JsonResponse {
            //     status: Unauthorized,
            //     content: "Unsupported authentication scheme"
            // }),
            None => return Box::new(ErrorResponse {
                status: Unauthorized,
                message: "Username and password requried."
            })
        };

        let root_dbobjs_result = self.dbms.get_root_dbobjs(credentials);

        match root_dbobjs_result {
            Ok(root_dbobjs) => Box::new(IndexResponse {
                root_dbobjs: root_dbobjs
            }),
            Err(err) => match err.kind {
                dbms::ErrorKind::InvalidCredentials => Box::new(ErrorResponse {
                    status: Unauthorized,
                    message: err.message,
                }),

                _ => Box::new(ErrorResponse {
                    status: InternalServerError,
                    message: err.message,
                })
            }
        }
    }
}

struct IndexResponse {
    root_dbobjs: Vec<dbms::DbObj>
}

impl http::Response for IndexResponse {
    fn write_to(self: Box<Self>, w: http::ResponseStarter) -> io::Result<()> {

        let mut initial_data = BTreeMap::new();
        initial_data.insert("databases", &self.root_dbobjs);

        let mut html = vec![];
        ui::render_home_page(&mut html,
                             json::as_json(&initial_data)
                             ).unwrap();

        let mut w = try!(w.start(http::Status::Ok));
        try!(w.write_content_type("text/html; charset=utf-8"));
        w.write_content(&html)
    }
}

pub struct ErrorResponse<T> {
    pub status: http::Status,
    pub message: T,
}

impl<T: Display> http::Response for ErrorResponse<T> {
    fn write_to(self: Box<Self>, w: http::ResponseStarter) -> io::Result<()> {
        let mut w = try!(w.start(self.status));
        try!(w.write_content_type("text/html; charset=utf-8"));
        if self.status == http::Status::Unauthorized {
            try!(w.write_www_authenticate_basic("postgres"));
        }

        let mut html = vec![];
        ui::render_error_page(
            &mut html,
            self.status as u16,
            self.status.phrase(),
            self.message
        ).unwrap();

        w.write_content(&html)
    }
}
