mod objects;
mod tables;

use http;
use std::io;
use rustc_serialize::{json, Encodable};
use dbms::Dbms;
use self::objects::DbObjDir;
use self::tables::TableResource;


pub fn handle_dbdir_req<TDbms: Dbms>(
    dbms: &TDbms,
    database: &str,
    tail: &[&str],
    req: &http::Request)
    -> Box<http::Response>
{
    http::Handler::handle_http_req(&DbDir {
        dbms: dbms,
        database: database.to_string(),
    }, tail, req)
}

pub struct DbDir<'dbms, TDbms: Dbms + 'dbms> {
    pub dbms: &'dbms TDbms,
    pub database: String,
}

impl<'dbms, TDbms: Dbms + 'dbms> http::Handler for DbDir<'dbms, TDbms> {
    fn handle_http_req(&self, path: &[&str], req: &http::Request) -> Box<http::Response> {
        use http::RequestCredentials::Basic;

        let (user, password) = match req.credentials.as_ref() {
            Some(&Basic { ref user, ref passwd }) => (&user[..], &passwd[..]),
            // Some(..) => return Box::new(JsonResponse {
            //     status: Unauthorized,
            //     content: "Unsupported authentication scheme"
            // }),
            None => return Box::new(JsonResponse {
                status: http::Status::Unauthorized,
                content: "Username and password requried."
            })
        };


        match path {
            ["objects", objtype, objid, tail..] => DbObjDir {
                dbms: self.dbms,
                user: user.to_string(),
                password: password.to_string(),
                database: self.database.clone(),
                objtype: objtype.to_string(),
                objid: objid.to_string(),
            }.handle_http_req(tail, req),

            ["tables", table_name] => TableResource {
                dbms: self.dbms,
                user: user.to_string(),
                password: password.to_string(),
                table_path: vec![table_name.to_string(), self.database.clone()],
            }.handle_http_req(&[], req),

            _ => Box::new(JsonResponse {
                status: http::Status::NotFound,
                content: "not found"
            })
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
        if self.status == http::Status::Unauthorized {
            try!(w.write_www_authenticate_basic("postgres"));
        }
        w.write_content(json::encode(&self.content).unwrap().as_bytes())
    }
}
