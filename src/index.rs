use std::io;
use std::collections::BTreeMap;
use rustc_serialize::json;
use http;
use pg;

pub struct IndexPage<'a> {
    pub pgaddr: &'a str
}

impl<'a> http::Handler for IndexPage<'a> {
    fn handle_http_req(&self,
                       _: &[&str],
                       req: &http::Request)
                       -> Box<http::Response>
    {
        let mut dbconn = {
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
                None => return Box::new(ErrorResponse {
                    status: Unauthorized,
                    message: "Username and password requried."
                })
            };

            let maybe_dbconn = pg::connect(self.pgaddr,
                                           "postgres",
                                           user, passwd);

            match maybe_dbconn {

                Ok(dbconn) => dbconn,

                Err(AuthFailed) => return Box::new(ErrorResponse {
                    status: Unauthorized,
                    message: "Invalid username or password."
                }),

                // Err(DatabaseNotExists) => return Box::new(ErrorResponse {
                //     status: InternalServerError,
                //     message: "Error ocurred while co"
                // }),

                Err(err) => {
                    println!("error while connecting to db: {:?}", err);
                    return Box::new(ErrorResponse {
                        status: InternalServerError,
                        message: "Failed to connect database, see logs for details."
                    });
                }
            }
        };

        let maybe_dbnodes = dbconn.query::<DbNode>(
            include_str!("tree/children/databases.sql")
        );

        let dbnodes = match maybe_dbnodes {
            Ok(dbnodes) => dbnodes,
            Err(err) => return Box::new(ErrorResponse {
                status: http::Status::InternalServerError,
                message: format!("Error while fetching db nodes: {}", err)
            })
        };

        Box::new(IndexPageResponse {
            databases: dbnodes
        })
    }
}

#[derive(RustcEncodable)]
#[derive(RustcDecodable)]
#[derive(PartialEq)]
struct DbNode {
    id: String,
    typ: String,
    name: String,
    comment: Option<String>,
    database: String,
    has_children: bool
}

struct IndexPageResponse {
    databases: Vec<DbNode>
}

impl http::Response for IndexPageResponse {
    fn write_to(self: Box<Self>, w: http::ResponseStarter) -> io::Result<()> {

        let mut initial_data = BTreeMap::new();
        initial_data.insert("databases", self.databases);

        let index_html = include_str!("static/dist/index.html");
        let index_html = index_html.replace("/*INITIAL_DATA_PLACEHOLDER*/",
                                            &json::encode(&initial_data).unwrap());

        let mut w = try!(w.start(http::Status::Ok));
        try!(w.write_content_type("text/html; charset=utf-8"));
        w.write_content(index_html.as_bytes())
    }
}

struct ErrorResponse<T> {
    status: http::Status,
    message: T
}

impl<T: ::std::fmt::Display> http::Response for ErrorResponse<T> {
    fn write_to(self: Box<Self>, w: http::ResponseStarter) -> io::Result<()> {
        let mut w = try!(w.start(self.status));
        try!(w.write_content_type("text/html; charset=utf-8"));
        if self.status == http::Status::Unauthorized {
            try!(w.write_www_authenticate_basic("postgres"));
        }
        w.write_content(format!("{}", self.message).as_bytes())
    }
}
