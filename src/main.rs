#![allow(unstable)]
#![feature(plugin)]

extern crate serialize;

#[macro_use] extern crate log;


extern crate regex;

#[plugin] #[no_link] extern crate regex_macros;

//use std::io::net::ip::Ipv4Addr;
//use hyper::server::{Request, Response};
//use postgres::{Connection, SslMode};

use std::old_io::{
    // TcpListener,
    TcpStream,
    IoResult,
    // Listener,
    ByRefWriter,
    Stream,
    IoError,
};

mod postgres;
mod http;

mod tree;


fn main() {
    let controller = Controller {
        pgaddr: "localhost:5432"
    };

    httpd::serve_forever("0.0.0.0:7890", controller);
}

struct Controller {
    pgaddr: &str
}

impl httpd::Handler for Controller {

    fn handle_http_request(&self,
                           req: httpd::Request,
                           resp: httpd::Response)
                           -> httpd::Result<()>
    {
        use httpd::RequestMethod::{Get, Post};

        println!("{:?}", req);

        //let path = &req.path.clone()[];
        let method = req.method;

        let path_vec = req.path.clone();
        let path_slices_vec = path_vec
            .iter()
            .map(|x| x.as_slice())
            .collect::<Vec<&str>>();

        let path = &path_slices_vec[];

        let ctrl = Controller { req: req, res: res };


        // /db/postgres/execute
        // /db/postgres/map
        // /db/postgres/nodes/<schema>/<100>/definition
        // /db/postgres/edit


        match req.path_segments() {
            ["" /* root */ ] => match req.method() {
                Get => self.handle_index_req(&req, resp),
                Post => self.handle_sqlexec_req(&req, resp),
                _ => respond_method_not_allowed(resp),
            }

            ["db", database, subpath..] => {
                self.handle_db_route_req(database, subpath, &req, resp)
            }

            ["favicon.ico"] => match req.method() {
                Get => handle_asset_req("favicon.ico", resp),
                _ => respond_method_not_allowed(resp),
            }

            ["assets", filename..] => match req.method() {
                Get => handle_asset_req(filename, resp),
                _ => respond_method_not_allowed(resp),
            }

            _ => respond_not_found(resp),

            // (Get, ["db", database, "nodes", nodetype, nodeid, "children"])
            // => ctrl.handle_db_req(NodeChidrenResource {
            //     database: database.to_string(),
            //     nodetype: nodetype.to_string(),
            //     nodeid: nodeid.to_string(),
            // }),

            // (Get, ["db", database, "nodes", nodetype, nodeid, "definition"])
            // => ctrl.handle_db_req(NodeDefinitionResource {
            //     database: database,
            //     nodetype: nodetype,
            //     nodeid: nodeid,
            // }),

            // (Post, [""])
            // => {

            //     #[derive(Decodable)]
            //     struct Params {
            //         sql_script: String,
            //     }

            //     let (ctrl, params) = match ctrl.decode_urlencoded_form::<Params>() {
            //         Ok(res) => res,
            //         Err(err) => return err,
            //     };

            //     let (exec_res, res) = match ExecuteResource::new(&params.sql_script[], ctrl.res) {
            //         Ok(x) => x,
            //         Err(err) => return err,
            //     };

            //     let ctrl = Controller { req: ctrl.req, res: res };


            //     ctrl.handle_db_req(exec_res)
            // },

            // // ["db", database, "execute"]
            // // => DbResource::new(database, ),

            // (Get, ["static", filename..])
            // => ctrl.use_resource(StaticResource::new(filename.connect("/"))),

            // (Get, ["favicon.ico"])
            // => ctrl.use_resource(StaticResource::new("favicon.ico".to_string())),

            // _
            // => ctrl.use_resource(NotFoundResource),
        }


        // match path {
        //     []
        //         => ctrl.handle_db_req("postgres", &[]),

        //     ["db", database, subpath..]
        //         => ctrl.handle_db_req(database, subpath),

        //     ["favicon.ico"]
        //         => ctrl.handle_static_req("favicon.ico"),

        //     ["static", filename..]
        //         => ctrl.handle_static_req(&filename.connect("/")[]),

        //     _
        //         => ctrl.handle_not_found(),
        // }

        // let (database, db_consumer) = match (method, path) {
        //     (Get, []) => ("postgres", Controller::handle_index_req),
        //     (Post, ["execute", database]) => (database, Controller::handle_script_req),
        //     //(Post, ["map", database]) => Controller::handle_
        //     (Get, ["tree", database, nodetype, nodeid, "children"]) => (database, |ctrl, dbconn| ctrl.handle_tree_req(dbconn, nodetype, nodeid)),
        //     (Get, ["tree", database, nodetype, nodeid, "definition"]) => (database, |ctrl, dbconn| ctrl.handle_tree_req(dbconn, nodetype, nodeid)),

        //     (Get, ["favicon.ico"]) => return ctrl.handle_static_req("favicon.ico"),
        //     (Get, ["static", ..filename]) => return ctrl.handle_static_req(filename.connect("/")),
        //     _ => return ctrl.handle_not_found(),
        // };

        // ctrl.handle_db_req(database, db_consumer)
    }
}

impl Controller {

    fn handle_db_route_req(&self,
                           dbname: &str,
                           path: &[&str],
                           req: &httpd::Request,
                           resp: httpd::Response)
                           -> httpd::Result
    {
        use httpd::RequestMethod::{Get, Patch};
        use httpd::ResponseStatus::{Unauthorized, NotFound};
        use postgres::ConnectionError::*;

        let dbconn = match connectdb(dbname, req) {
            Ok(dbconn) => dbconn,
            Err(connerr) => return match connerr {
                AuthenticationError => {
                    let resp = try!(resp.start(Unauthorized));
                    try!(resp.write_content_type("application/json"));
                    try!(resp.write_content(stringify!({
                        "error": "Invalid username or password."
                    })));
                }

                DatabaseNotExists => {
                    let resp = try!(resp.start(NotFound));
                    try!(resp.write_content_type("application/json"));
                    try!(resp.write_content(stringify!({
                        "error": "Database not found."
                    })));
                }
            },
        };

        match path {
            ["nodes", nodetype, nodeid, tail] => {
                let nodetype = match NodeType::from_str(nodetype) {
                    Some(nodetype) => nodetype,
                    None => {
                        let resp = try!(resp.start(NotFound));
                        try!(resp.write_content_type("application/json"));
                        try!(resp.write_content(stringify!({
                            "error": "Unknown node type."
                        })));
                    }
                };

                let node_service = NodeService::new(nodetype, nodeid, dbconn);

                match tail {
                    "definition" => match req.method() {
                        Get => handle_node_definition_req(node_service, resp),
                        _ => respond_method_not_allowed(resp)
                    }

                    "children" => match req.method() {
                        Get => handle_node_children_req(node_service, resp),
                        _ => respond_method_not_allowed(resp)
                    }

                    _ => respond_not_found(resp)
                }
            }

            ["tables", tableid] => match req.method() {
                Patch => self.handle_table_patch_req(dbconn, tableid, req, resp),
                _ => respond_method_not_allowed(resp)
            }

            _ => respond_not_found(resp)
        }
    }

    fn handle_sqlexec_req(&self,
                          req: &httpd::Request,
                          resp: httpd::Response)
                          -> httpd::Result
    {

    }

    fn handle_index_req(&self,
                        req: &httpd::Request,
                        resp: httpd::Response)
                        -> httpd::Result
    {

    }

    fn handle_table_patch_req(&self,
                              dbconn: postgres::Connection,
                              tableid: postgres::Oid,
                              req: &httpd::Request,
                              resp: httpd::Response)
                              -> httpd::Result
    {

    }

    fn connectdb(&self, dbname: &str, req: &httpd::Request) -> postgres::ConnectionResult {
        use httpd::RequestCredentials::Basic;
        let (username, password) = match req.credentials() {
            Some(Basic { username, password }) => (username, password),
            Some(..) => "unsupported authentication scheme",
            None => "username and password requried.",
        };

        let dbconn = try!(postgres::connect(self.pgaddr, dbname, username, password));
        dbconn
    }
}











































































fn guess_content_type(extension: &[u8]) -> &str {
    match extension {
        b"html" => "text/html",
        b"js" => "application/javascript",
        b"css" => "text/css",
        b"ico" => "image/vnd.microsoft.icon",
        _ => "application/octet-stream",
    }
}

fn extract_connect_metacmd(sql_script: &str) -> Option<((&str, usize), (&str, usize))> {
    let pat = regex!(r"(?ms)^\s*\\c(?:onnect)?[ \t]+(\w+)[ \t]*[\r\n]+(.*)");
    pat.captures(sql_script)
        .map(|captures| (
            (captures.at(1).unwrap(), captures.pos(1).unwrap().0),
            (captures.at(2).unwrap(), captures.pos(2).unwrap().0),
        ))
}

#[test]
fn test_extract_connect_metacmd() {
    let result = extract_connect_metacmd(
        "\\connect postgres\nselect 'awesome'"
    );

    assert_eq!(result, Some((("postgres", 9), ("select 'awesome'", 18))));
}



struct Controller<THttpWriter: Writer> {
    req: http::Request,
    res: http::ResponseStarter<THttpWriter>,
}

impl<THttpWriter: Writer> Controller<THttpWriter> {



    fn decode_urlencoded_form<TForm: ::serialize::Decodable>(self) -> Result<(Self, TForm), IoResult<()>> {
        let content = self.req.content.clone();
        if let Some(http::RequestContent::UrlEncoded(form)) = content {
            return match http::form::decode_form(form) {
                Ok(ret) => Ok((self, ret)),
                Err(decode_err) => Err(
                    self.res.start(http::Status::BadRequest)
                    .and_then(|resp_writer| resp_writer.write_content(b"invalid form"))),
            };
        }

        Err(self.res.start(http::Status::BadRequest)
            .and_then(|resp_writer| resp_writer.write_content(b"invalid form")))

    }

    fn use_resource<TRes: Resource>(self, resource: TRes) -> IoResult<()> {
        resource.handle(self.req, self.res)
    }



    fn handle_not_found(self) -> IoResult<()> {
        use http::Status::NotFound;
        let mut a = try!(self.res.start(NotFound));
        try!(a.write_content_type("text/plain"));
        try!(a.write_content(b"Not Found"));

        Ok(())
    }

    // fn handle_tree_req(self) -> IoResult<()> {
    //     use http::form::decode_form;

    //     #[derive(Decodable)]
    //     struct Params {
    //         nodeid: String,
    //         nodetype: String,
    //         database: String,
    //     }

    //     let Params {
    //         nodeid,
    //         nodetype,
    //         database,
    //     } = decode_form(self.req.query_string.clone()).unwrap();

    //     self.handle_db_req(|ctrl, dbconn| ctrl._handle_tree_req(dbconn,
    //                                                             nodeid.clone(),
    //                                                             nodetype.clone()))


    // }

    // fn _handle_tree_req(self, dbconn: postgres::DatabaseConnection<TcpStream>, nodeid: String, nodetype: String) -> IoResult<()> {
    //     use serialize::json;

    //     let children = tree::NodeService {
    //         dbconn: dbconn,
    //         nodeid: nodeid,
    //         nodetype: nodetype,
    //     }.get_children().unwrap();

    //     let mut a = try!(self.res.start_ok());
    //     try!(a.write_content_type("application/json"));
    //     try!(a.write_content(json::encode(&children).as_bytes()));

    //     Ok(())
    // }


    fn handle_static_req(self, path: &str) -> IoResult<()> {
        use std::old_io::File;
        use std::path::Path;

        let path: String = ["src/static/", path].concat();

        let path = Path::new(path);

        let content = File::open(&path)
                            .read_to_end()
                            .unwrap();

        let ext = path.extension().unwrap_or(b"");

        let mut a = try!(self.res.start_ok());
        try!(a.write_content_type(guess_content_type(ext)));
        try!(a.write_content(&content[]));

        Ok(())
    }

    fn handle_unauthorized_req(self) -> IoResult<()> {
        use http::Status::Unauthorized;

        let mut a = try!(self.res.start(Unauthorized));
        try!(a.write_www_authenticate_basic("postgres"));
        try!(a.write_content_type("text/html"));
        try!(a.write_content(b"ololo"));
        Ok(())
    }

    fn handle_db_req<TDbConsumer: DbConsumer>(self, db_consumer: TDbConsumer) -> IoResult<()> {

        let dbconn_res = {
            let &(ref user, ref password) = match self.req.basic_auth {
                Some(ref x) => x,
                None => return self.handle_unauthorized_req(),
            };

            postgres::connect_tcp("localhost:5432",
                                  &db_consumer.get_dbname()[],
                                  &user[],
                                  &password[])
        };

        let dbconn = match dbconn_res {
            Ok(conn) => conn,
            Err(postgres::ConnectError::ErrorResponse(postgres::ErrorOrNotice { sqlstate_class: postgres::SqlStateClass::InvalidAuthorizationSpecification, .. })) => {
                return self.handle_unauthorized_req();
            },
            Err(e) => { println!("{:?}", e); panic!("err"); },
        };

        db_consumer.consume_connection(dbconn, self.req, self.res)
    }


}


trait Resource: Sized {

    fn handle<THttpWriter: Writer>(self, req: http::Request, res: http::ResponseStarter<THttpWriter>) -> IoResult<()> {
        match req.method {
            http::Method::Get => self.get(req, res),
            http::Method::Post => self.post(req, res),
        }
    }

    fn get<THttpWriter: Writer>(self, req: http::Request, res: http::ResponseStarter<THttpWriter>) -> IoResult<()> {
        self.method_not_allowed(res)
    }

    fn post<THttpWriter: Writer>(self, req: http::Request, res: http::ResponseStarter<THttpWriter>) -> IoResult<()> {
        self.method_not_allowed(res)
    }

    fn method_not_allowed<THttpWriter: Writer>(self, res: http::ResponseStarter<THttpWriter>) -> IoResult<()> {
        let mut resp_writer = try!(res.start(http::Status::MethodNotAllowed));
        resp_writer.write_content(b"MethodNotAllowed")
    }
}

struct StaticResource {
    filename: String,
}

impl StaticResource {
    fn new(filename: String) -> StaticResource {
        StaticResource { filename: filename }
    }
}

impl Resource for StaticResource {
    fn get<THttpWriter: Writer>(self, req: http::Request, res: http::ResponseStarter<THttpWriter>) -> IoResult<()> {
        use std::old_io::File;
        use std::path::Path;

        let path: String = ["src/static/", &self.filename[]].concat();

        let path = Path::new(path);

        let content = File::open(&path)
                            .read_to_end()
                            .unwrap();

        let ext = path.extension().unwrap_or(b"");

        let mut a = try!(res.start_ok());
        try!(a.write_content_type(guess_content_type(ext)));
        try!(a.write_content(&content[]));

        Ok(())
    }
}


struct NotFoundResource;

impl Resource for NotFoundResource {
    fn handle<THttpWriter: Writer>(self, req: http::Request, res: http::ResponseStarter<THttpWriter>) -> IoResult<()> {
        let mut resp_writer = try!(res.start(http::Status::NotFound));
        try!(resp_writer.write_content_type("text/plain"));
        try!(resp_writer.write_content(b"Not Found"));

        Ok(())
    }
}





fn respond_unauthorized<TWriter: Writer>(res: http::ResponseStarter<TWriter>) -> IoResult<()> {
    let mut a = try!(res.start(http::Status::Unauthorized));
    try!(a.write_www_authenticate_basic("postgres"));
    try!(a.write_content_type("text/html"));
    try!(a.write_content(b"ololo"));
    Ok(())
}

type HttpResult = IoResult<()>;

trait DbConsumer {

    fn get_dbname(&self) -> String;

    fn consume_connection<THttpWriter: Writer, TDbStream: Stream>(
        &self,
        dbconn: postgres::Connection<TDbStream>,
        req: http::Request,
        res: http::ResponseStarter<THttpWriter>
        ) -> IoResult<()>;

    fn respond_database_not_found<THttpWriter: Writer>(
        &self,
        req: http::Request,
        res: http::ResponseStarter<THttpWriter>
        ) -> IoResult<()>
    {
        let mut resp_writer = try!(res.start(http::Status::BadRequest));
        try!(resp_writer.write_content_type("application/json"));
        try!(resp_writer.write_content(b"\"Database not found!\""));

        Ok(())
    }


    fn respond_missing_credentials<THttpWriter: Writer>(
        &self,
        req: http::Request,
        res: http::ResponseStarter<THttpWriter>
        ) -> IoResult<()>
    {
        let mut resp_writer = try!(res.start(http::Status::Unauthorized));

        try!(resp_writer.write_www_authenticate_basic("postgres"));
        try!(resp_writer.write_content_type("application/json"));
        try!(resp_writer.write_content(b"\"Username and password required!\""));

        Ok(())
    }


    fn respond_invalid_credentials<THttpWriter: Writer>(
        &self,
        req: http::Request,
        res: http::ResponseStarter<THttpWriter>
        ) -> IoResult<()>
    {

        let mut resp_writer = try!(res.start(http::Status::Unauthorized));

        try!(resp_writer.write_www_authenticate_basic("postgres"));
        try!(resp_writer.write_content_type("application/json"));
        try!(resp_writer.write_content(b"\"Invalid username or password!\""));

        Ok(())
    }
}


struct IndexResource;

impl DbConsumer for IndexResource {
    fn get_dbname(&self) -> String { "postgres".to_string() }

    fn consume_connection<THttpWriter: Writer, TDbStream: Stream>(
        &self,
        mut dbconn: postgres::Connection<TDbStream>,
        req: http::Request,
        res: http::ResponseStarter<THttpWriter>
        ) -> IoResult<()>
    {
        use serialize::json;
        use serialize::json::Json;
        use std::collections::BTreeMap;

        let rows = dbconn.execute_query("
            SELECT datname AS name
                     ,shobj_description(oid, 'pg_database') AS comment
               FROM pg_database
               WHERE NOT datistemplate
               ORDER BY datname
        ").unwrap();

        let row_tuples = rows.iter().map(|row| {
            use serialize::json::ToJson;
            if let [ref name, ref comment] = &row[] {
                let mut obj = BTreeMap::new();
                obj.insert("id", name.to_json());
                obj.insert("typ", "database".to_json());
                obj.insert("name", name.to_json());
                obj.insert("comment", comment.to_json());
                obj.insert("database", name.to_json());
                obj.insert("has_children", true.to_json());
                obj
            } else {
                panic!("Row with unexpected structure was recived
                        while querying database nodes.");
            }
        }).collect::<Vec<BTreeMap<&str, Json>>>();

        let mut initial_data = BTreeMap::new();
        initial_data.insert("databases", row_tuples);



        let index_html = include_str!("index_.html");
        let index_html = index_html.replace("/*INITIAL_DATA_PLACEHOLDER*/",
                                            &json::encode(&initial_data)[]);


        let mut resp_writer = try!(res.start_ok());
        try!(resp_writer.write_content_type("text/html; charset=utf-8"));
        try!(resp_writer.write_content(index_html.as_bytes()));

        Ok(())
    }
}


struct NodeChidrenResource {
    database: String,
    nodetype: String,
    nodeid: String,
}

impl DbConsumer for NodeChidrenResource {
    fn get_dbname(&self) -> String { self.database.clone() }

    fn consume_connection<THttpWriter: Writer, TDbStream: Stream>(
        &self,
        dbconn: postgres::Connection<TDbStream>,
        req: http::Request,
        res: http::ResponseStarter<THttpWriter>
        ) -> IoResult<()>
    {
        use serialize::json;

        let mut node_service = tree::NodeService {
            dbconn: dbconn,
            nodeid: self.nodeid.clone(),
            nodetype: self.nodetype.clone(),

        };


        let children = node_service.get_children().unwrap();

        let mut a = try!(res.start_ok());
        try!(a.write_content_type("application/json; charset=utf-8"));
        try!(a.write_content(json::encode(&children).as_bytes()));

        Ok(())
    }
}


struct NodeDefinitionResource<'a> {
    database: &'a str,
    nodetype: &'a str,
    nodeid: &'a str,
}

impl<'a> DbConsumer for NodeDefinitionResource<'a> {
    fn get_dbname(&self) -> String { self.database.to_string() }

    fn consume_connection<THttpWriter: Writer, TDbStream: Stream>(
        &self,
        dbconn: postgres::Connection<TDbStream>,
        req: http::Request,
        res: http::ResponseStarter<THttpWriter>
        ) -> IoResult<()>
    {
        use serialize::json;

        let mut node_service = tree::NodeService {
            dbconn: dbconn,
            nodeid: self.nodeid.to_string(),
            nodetype: self.nodetype.to_string(),
        };

        let children = node_service.get_definition().unwrap();

        let mut a = try!(res.start_ok());
        try!(a.write_content_type("application/json; charset=utf-8"));
        try!(a.write_content(json::encode(&children).as_bytes()));

        Ok(())
    }
}




struct ExecuteResource<'a> {
    dbname: &'a str,
    connect_metacmd_pos: usize,
    sql_script: &'a str,
    sql_script_pos: usize,
}


impl<'a> ExecuteResource<'a> {
    fn new<THttpWriter: Writer>(sql_script_with_dbname: &str,
                                res: http::ResponseStarter<THttpWriter>
                                ) -> Result<(ExecuteResource, http::ResponseStarter<THttpWriter>), HttpResult>
    {
        match extract_connect_metacmd(sql_script_with_dbname) {
            Some(((dbname, connect_metacmd_pos), (sql_script, sql_script_pos))) => Ok((
                ExecuteResource {
                    dbname: dbname,
                    connect_metacmd_pos: connect_metacmd_pos,
                    sql_script: sql_script,
                    sql_script_pos: sql_script_pos,
                },
                res
            )),

            None => {
                Err(res.start_ok()
                    .and_then(|resp| resp.write_content(b"\\connect dbname expected on first line.")))
            }
        }
    }
}



impl<'a> DbConsumer for ExecuteResource<'a> {


    fn get_dbname(&self) -> String { self.dbname.to_string() }

    fn consume_connection<THttpWriter: Writer, TDbStream: Stream>(
        &self,
        mut dbconn: postgres::Connection<TDbStream>,
        req: http::Request,
        res: http::ResponseStarter<THttpWriter>
        ) -> IoResult<()>
    {

        {
            match dbconn.execute_script(self.sql_script) {
                Ok(events) => {
                    let mut resp_writer = try!(res.start_ok());
                    try!(resp_writer.write_content_type("text/html; charset=utf-8"));
                    let ref mut writer = &mut try!(resp_writer.start_chunked());

                    try!(dispatch_exec_events(events, TableView(writer.by_ref())));

                    try!(writer.write(b"\r\n"));
                    try!(writer.end());
                },
                Err(io_err) => {
                    let mut resp_writer = try!(res.start_ok());
                    try!(resp_writer.write_content_type("text/html; charset=utf-8"));
                    try!(resp_writer.write_content(b"Everything is broken."));
                },
            }
        }



        if let Err(e) = dbconn.finish() {
            println!("db finish err = {:?}", e);
        }

        Ok(())
    }
}


fn dispatch_exec_events<TEventsIter, TView>(mut events_iter: TEventsIter, mut view: TView) -> IoResult<()>
    where TEventsIter: Iterator<Item=postgres::ExecuteEvent>,
          TView: View
{
    for event in events_iter {
        use postgres::ExecuteEvent::*;
        try!(match event {
            RowsetBegin(cols_descr) => view.render_rowset_begin(&cols_descr[]),
            RowsetEnd => view.render_rowset_end(),
            RowFetched(row) => view.render_row(&row[]),
            NonQueryExecuted(cmd) => view.render_nonquery(&cmd[]),
            SqlErrorOccured(err) => view.render_sql_error(err),
            IoErrorOccured(err) => view.render_io_error(err),
            Notice(notice) => view.render_notice(notice),
        });
    }

    Ok(())
}

trait View {
    //fn new<TWriter: Writer>(writer: TWriter) -> Self;

    fn render_rowset_begin(&mut self, rowset_id: i32, &[(String, String, bool)]) -> io::Result<()>;
    fn render_rowset_end(&mut self) -> io::Result<()>;
    fn render_row(&mut self, &[Option<String>]) -> io::Result<()>;
    fn make_rowset_editable(&mut self, rowset_id: i32, &[(, )]) -> io::Result<()>;
    fn render_notice(&mut self, postgres::ErrorOrNotice) -> io::Result<()>;
    fn render_sql_error(&mut self, message: &str, script_line: Option<usize>) -> io::Result<()>;
    fn render_io_error(&mut self, IoError) -> io::Result<()>;
    fn render_nonquery(&mut self, &str) -> io::Result<()>;
}

struct TableView<T: Writer>(T);

impl<T: Writer> View for TableView<T> {
    fn render_rowset_begin(&mut self, rowset_id: i32, cols_descr: &[postgres::FieldDescription]) -> IoResult<()> {
        let writer = &mut self.0;
        try!(writer.write(b"<table>"));
        try!(writer.write(b"<tr>"));
        try!(writer.write(b"<th></th>"));
        for col in cols_descr.iter() {
            try!(write!(writer, "<th>{}</th>", col.name));
        }
        try!(writer.write(b"</tr>"));
        Ok(())
    }

    fn render_rowset_end(&mut self) -> IoResult<()> {
        self.0.write(b"</table>")
    }

    fn render_row(&mut self, row: &[Option<String>]) -> IoResult<()> {
        let writer = &mut self.0;
        try!(writer.write(b"<tr>"));
        try!(writer.write(b"<th></th>"));
        for maybe_val in row.iter() {
            try!(match maybe_val {
                &Some(ref val) if val.is_empty() => writer.write(b"<td class=\"emptystr\"></td>"),
                &Some(ref val) => write!(writer, "<td>{}</td>", val),
                &None => writer.write(b"<td></td>"),
            });
        }
        try!(writer.write(b"</tr>"));
        Ok(())
    }

    fn render_io_error(&mut self, err: IoError) -> IoResult<()> {
        write!(&mut self.0, "<pre>{:?}</pre>", err)
    }

    fn render_sql_error(&mut self, err: postgres::ErrorOrNotice) -> IoResult<()> {
        write!(&mut self.0, "<pre>{:?}</pre>", err)
    }

    fn render_notice(&mut self, err: postgres::ErrorOrNotice) -> IoResult<()> {
        write!(&mut self.0, "<pre>{:?}</pre>", err)
    }

    fn render_nonquery(&mut self, cmd: &str) -> IoResult<()> {
        write!(&mut self.0, "<pre>{}</pre>", cmd)
    }
}





