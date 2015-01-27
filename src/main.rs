#![allow(unstable)]

extern crate serialize;

#[macro_use] extern crate log;

//use std::io::net::ip::Ipv4Addr;
//use hyper::server::{Request, Response};
//use postgres::{Connection, SslMode};

use std::io::{
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


fn guess_content_type(extension: &[u8]) -> &str {
    match extension {
        b"html" => "text/html",
        b"js" => "application/javascript",
        b"css" => "text/css",
        b"ico" => "image/vnd.microsoft.icon",
        _ => "application/octet-stream",
    }
}



struct Controller<THttpWriter: Writer> {
    req: http::Request,
    res: http::ResponseStarter<THttpWriter>,
}

impl<THttpWriter: Writer> Controller<THttpWriter> {

    fn handle_req(req: http::Request, res: http::ResponseStarter<THttpWriter>) -> IoResult<()> {
        use http::Method::{ Get, Post };

        println!("{:?}", req);

        //let path = &req.path.clone()[];
        //let method = req.method;

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


        match path {
            ["" /* root */ ]
            => ctrl.handle_db_req(IndexResource),

            ["db", database, "nodes", nodetype, nodeid, "children"]
            => ctrl.handle_db_req(NodeChidrenResource {
                database: database.to_string(),
                nodetype: nodetype.to_string(),
                nodeid: nodeid.to_string(),
            }),

            ["db", database, "nodes", nodetype, nodeid, "definition"]
            => ctrl.handle_db_req(NodeDefinitionResource {
                database: database,
                nodetype: nodetype,
                nodeid: nodeid,
            }),

            ["db", database, "execute"]
            => {

                #[derive(Decodable)]
                struct Params {
                    sql_script: String,
                }

                ctrl.decode_urlencoded_form::<Params>()
                    .map(|(ctrl, params)| ctrl.handle_db_req(ExecuteResource {
                        database: database,
                        sql_script: &params.sql_script[],
                    }))
                    .unwrap_or_else(|err| err)
            },

            // ["db", database, "execute"]
            // => DbResource::new(database, ),

            ["static", filename..]
            => ctrl.use_resource(StaticResource::new(filename.connect("/"))),

            ["favicon.ico"]
            => ctrl.use_resource(StaticResource::new("favicon.ico".to_string())),

            _
            => ctrl.use_resource(NotFoundResource),
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
        use std::io::File;
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
                                  &db_consumer.get_database_name()[],
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
        use std::io::File;
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



trait DbConsumer {

    fn get_database_name(&self) -> String;

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
    fn get_database_name(&self) -> String { "postgres".to_string() }

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
                obj.insert("type", "database".to_json());
                obj.insert("name", name.to_json());
                obj.insert("comment", comment.to_json());
                obj.insert("database", name.to_json());
                obj.insert("hasChildren", true.to_json());
                obj
            } else {
                panic!("Row with unexpected structure was recived
                        while querying database nodes.");
            }
        }).collect::<Vec<BTreeMap<&str, Json>>>();

        let mut initial_data = BTreeMap::new();
        initial_data.insert("databases", row_tuples);



        let index_html = include_str!("index.html");
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
    fn get_database_name(&self) -> String { self.database.clone() }

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
    fn get_database_name(&self) -> String { self.database.to_string() }

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
    database: &'a str,
    sql_script: &'a str,
}

impl<'a> DbConsumer for ExecuteResource<'a> {
    fn get_database_name(&self) -> String { self.database.to_string() }

    fn consume_connection<THttpWriter: Writer, TDbStream: Stream>(
        &self,
        mut dbconn: postgres::Connection<TDbStream>,
        req: http::Request,
        res: http::ResponseStarter<THttpWriter>
        ) -> IoResult<()>
    {
        let mut a = try!(res.start_ok());
        try!(a.write_content_type("text/html; charset=utf-8"));
        let writer = &mut try!(a.start_chunked());

        {
            let mut view = TableView(writer.by_ref());
            for exec_event in try!(dbconn.execute_script(self.sql_script)) {
                use postgres::ExecuteEvent::*;
                try!(match exec_event {
                    RowsetBegin(cols_descr) => view.render_rowset_begin(&cols_descr[]),
                    RowsetEnd => view.render_rowset_end(),
                    RowFetched(row) => view.render_row(&row[]),
                    NonQueryExecuted(cmd) => view.render_nonquery(&cmd[]),
                    SqlErrorOccured(err) => view.render_sql_error(err),
                    IoErrorOccured(err) => view.render_io_error(err),
                    Notice(notice) => view.render_notice(notice),
                });
            }
        }

        try!(writer.write(b"\r\n"));
        try!(writer.end());

        dbconn.finish();

        Ok(())
    }
}


trait View {
    //fn new<TWriter: Writer>(writer: TWriter) -> Self;

    fn render_rowset_begin(&mut self, &[postgres::FieldDescription]) -> IoResult<()>;
    fn render_rowset_end(&mut self) -> IoResult<()>;
    fn render_row(&mut self, &[Option<String>]) -> IoResult<()>;
    fn render_notice(&mut self, postgres::ErrorOrNotice) -> IoResult<()>;
    fn render_sql_error(&mut self, postgres::ErrorOrNotice) -> IoResult<()>;
    fn render_io_error(&mut self, IoError) -> IoResult<()>;
    fn render_nonquery(&mut self, &str) -> IoResult<()>;
}

struct TableView<T: Writer>(T);

impl<T: Writer> View for TableView<T> {
    fn render_rowset_begin(&mut self, cols_descr: &[postgres::FieldDescription]) -> IoResult<()> {
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


fn main() {
    http::serve_forever_tcp("0.0.0.0:7890", Controller::handle_req);
}






