use std::io;
use rustc_serialize::{json, Encodable};
use http;
use pg;

mod tree;

use self::tree::DbObjType;

pub struct DbDir {
    pub pgaddr: String,
    pub dbname: String
}

impl http::Handler for DbDir {

    fn handle_http_req(&self,
                       path: &[&str],
                       req: &http::Request)
                       -> Box<http::Response>
    {
        match path {
            ["objects", objtype, objid, tail..] => {
                let objtype = match DbObjType::from_str(objtype) {
                    Some(objtype) => objtype,
                    None => return Box::new(JsonResponse {
                        status: http::Status::NotFound,
                        content: "Unknown type of database object."
                    })
                };

                DbObj {
                    pgaddr: self.pgaddr.clone(),
                    dbname: self.dbname.clone(),
                    objtype: objtype,
                    objid: objid.to_string(),
                }.handle_http_req(tail, req)
            }

            ["tables", tableid] => {
                TableResource {
                    pgaddr: self.pgaddr.clone(),
                    dbname: self.dbname.clone(),
                    tableid: tableid.to_string()
                }.handle_http_req(&[], req)
            }

            // ["tables", tableid] => {

            // }

            _ => Box::new(JsonResponse {
                status: http::Status::NotFound,
                content: "not found"
            })
        }
    }
}


struct JsonResponse<T: Encodable> {
    status: http::Status,
    content: T
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


// trait PgConnector {
//     fn connect(&self, dbname: &str, user: &str, passwd: &str) -> pg::ConnectionResult;
// }

// struct PgConnectorImpl {
//     pgaddr: String
// }

struct DbObjChildren {
    pgaddr: String,
    dbname: String,
    objtype: DbObjType,
    objid: String,
}

impl http::Resource for DbObjChildren {
    fn get(&self, req: &http::Request) -> Box<http::Response> {
        let mut dbconn = match connectdb_for_dbdir(&self.pgaddr, &self.dbname, req) {
            Ok(dbconn) => dbconn,
            Err(resp) => return resp
        };

        fn quote_literal(s: &str) -> String {
            ["'", &s.replace("'", "''")[..], "'"].concat()
        }

        let query = self.objtype.children_query();

        let query = query.replace("%(nodeid)s", &quote_literal(&self.objid))
                         .replace("%(nodetype)s", &quote_literal(self.objtype.to_str()));

        #[derive(RustcDecodable, RustcEncodable)]
        struct ChildDbObj {
            database: String,
            id: String,
            typ: String,
            name: String,
            comment: Option<String>,
            has_children: bool,
        }

        let result = match dbconn.query::<ChildDbObj>(&query) {
            Ok(result) => result,
            Err(err) => {
                println!("error while fetching dbobj children: {:?}", err);
                return Box::new(JsonResponse {
                    status: http::Status::InternalServerError,
                    content: "Error occured, see log for details."
                });
            }
        };

        Box::new(JsonResponse {
            status: http::Status::Ok,
            content: result
        })
    }
}

struct DbObjDefinition {
    pgaddr: String,
    dbname: String,
    objtype: DbObjType,
    objid: String,
}

impl http::Resource for DbObjDefinition {
    fn get(&self, req: &http::Request) -> Box<http::Response> {
        let mut dbconn = match connectdb_for_dbdir(&self.pgaddr, &self.dbname, req) {
            Ok(dbconn) => dbconn,
            Err(resp) => return resp
        };

        fn quote_literal(s: &str) -> String {
            ["'", &s.replace("'", "''")[..], "'"].concat()
        }

        let query = self.objtype.definition_query();

        let query = query.replace("%(nodeid)s", &quote_literal(&self.objid))
                         .replace("%(nodetype)s", &quote_literal(self.objtype.to_str()));

        #[derive(RustcDecodable)]
        struct Definition {
            def: String,
        }

        let mut result = match dbconn.query::<Definition>(&query) {
            Ok(result) => result,
            Err(err) => return Box::new(JsonResponse {
                status: http::Status::InternalServerError,
                content: format!("Error while fetching dbobj definition: {:?}", err)
            })
        };

        let result = match result.pop() {
            Some(tuple) => tuple.def,
            None => return Box::new(JsonResponse {
                status: http::Status::NotFound,
                content: "Object id was not found."
            })
        };

        Box::new(JsonResponse {
            status: http::Status::Ok,
            content: [
                "\\connect ",
                &self.dbname[..],
                "\r\n\r\n",
                &result[..]
            ].concat()
        })
    }
}


struct DbObj {
    pgaddr: String,
    dbname: String,
    objtype: DbObjType,
    objid: String,
}

impl http::Handler for DbObj {
    fn handle_http_req(&self, path: &[&str], req: &http::Request) -> Box<http::Response> {
        match path {
            ["children"] => DbObjChildren {
                pgaddr: self.pgaddr.clone(),
                dbname: self.dbname.clone(),
                objtype: self.objtype.clone(),
                objid: self.objid.clone(),
            }.handle_http_req(path, req),

            ["definition"] => DbObjDefinition {
                pgaddr: self.pgaddr.clone(),
                dbname: self.dbname.clone(),
                objtype: self.objtype.clone(),
                objid: self.objid.clone(),
            }.handle_http_req(path, req),

            _ => Box::new(JsonResponse {
                status: http::Status::NotFound,
                content: "not found"
            })
        }
    }
}



fn connectdb_for_dbdir(
    pgaddr: &str,
    dbname: &str,
    req: &http::Request)
    -> Result<pg::Connection, Box<http::Response>>
{
    use http::RequestCredentials::Basic;
    use http::Status::{
        NotFound,
        Unauthorized,
        InternalServerError,
    };
    use pg::ConnectionError::{
        AuthFailed,
        DatabaseNotExists,
    };

    let (user, passwd) = match req.credentials.as_ref() {
        Some(&Basic { ref user, ref passwd }) => (&user[..], &passwd[..]),
        // Some(..) => return Box::new(JsonResponse {
        //     status: Unauthorized,
        //     content: "Unsupported authentication scheme"
        // }),
        None => return Err(Box::new(JsonResponse {
            status: Unauthorized,
            content: "Username and password requried."
        }))
    };

    let maybe_dbconn = pg::connect(pgaddr, dbname, user, passwd);

    maybe_dbconn.map_err(|err| match err {

        AuthFailed => Box::new(JsonResponse {
            status: Unauthorized,
            content: "Invalid username or password."
        }),

        DatabaseNotExists => Box::new(JsonResponse {
            status: NotFound,
            content: "Database not exists."
        }),

        err => {
            println!("error while connecting to db: {:?}", err);
            Box::new(JsonResponse {
                status: InternalServerError,
                content: "Failed to connect database, see logs for details."
            })
        }
    } as Box<http::Response>)
}


struct TableResource {
    pgaddr: String,
    dbname: String,
    tableid: String
}

impl http::Resource for TableResource {
    fn patch(&self, req: &http::Request) -> Box<http::Response> {
        let mut dbconn = match connectdb_for_dbdir(&self.pgaddr, &self.dbname, req) {
            Ok(dbconn) => dbconn,
            Err(resp) => return resp
        };

        #[derive(Debug)]
        #[derive(RustcDecodable)]
        enum PatchAction {
            Insert,
            Update,
            Delete
        }

        #[derive(Debug)]
        #[derive(RustcDecodable)]
        struct Form {
            action: PatchAction,
            changes: ::std::collections::BTreeMap<String, String>,
            key: ::std::collections::BTreeMap<String, String>
        }

        let content = match req.content.as_ref() {
            Some(x) => x,
            None => return Box::new(JsonResponse {
                content: "Missing content",
                status: http::Status::BadRequest
            })
        };

        let utf8_content = match ::std::str::from_utf8(content) {
            Ok(x) => x,
            Err(..) => return Box::new(JsonResponse {
                content: "Invalid UTF8 content",
                status: http::Status::BadRequest
            })
        };

        let form = match json::decode::<Form>(utf8_content) {
            Ok(x) => x,
            Err(..) => return Box::new(JsonResponse {
                content: "Cannot decode form",
                status: http::Status::BadRequest
            })
        };

        println!("{:#?}", form);

        Box::new(JsonResponse {
            content: "hello",
            status: http::Status::Ok
        })
    }
}
