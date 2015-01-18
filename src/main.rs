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


        let resource = match path {
            // [ /* root */ ]
            // => IndexResource::new(),

            // ["db", database, "execute"]
            // => DbResource::new(database, ),

            ["static", filename..]
            => StaticResource::new(filename),

            ["favicon.ico"]
            => StaticResource::new("favicon.ico"),

            _
            => NotFoundResource::new(),
        };

        resource.handle_req(req, res)


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

    fn handle_db_req(self, database: &str, path: &[&str]) -> IoResult<()> {



        let dbconn_res = {
            let &(ref user, ref password) = match self.req.basic_auth {
                Some(ref x) => x,
                None => return self.handle_unauthorized_req(),
            };

            let server_conn = try!(postgres::connect_tcp("localhost:5432"));
            server_conn.connect_database(database,
                                          &user[],
                                          &password[])
        };

        let dbconn = match dbconn_res {
            Ok(conn) => conn,
            Err(postgres::ConnectError::AuthenticationFailed) => {
                return self.handle_unauthorized_req();
            },
            Err(e) => { println!("{:?}", e); panic!("err"); },
        };

        let ctrl = DbHandler {
            req: self.req,
            res: self.res,
            dbconn: dbconn,
        };

        match path {
            []
                => ctrl.handle_index(),

            ["execute"] | ["map"]
                => ctrl.handle_script_req::<TableView<THttpWriter>>(),

            ["nodes", nodetype, nodeid, action]
                => ctrl.handle_node_req(action, nodetype, nodeid),

            _
                => ctrl.handle_not_found(),
        }
    }


}


trait Resource<THttpWriter: Writer> {

    fn handle(self, req: http::Request, res: http::ResponseStarter<THttpWriter>) -> IoResult<()> {
        match req.method {
            http::Method::Get => self.get(req, res),
            http::Method::Post => self.post(req, res),
        }
    }

    fn get(self, req: http::Request, res: http::ResponseStarter<THttpWriter>) -> IoResult<()> {
        self.method_not_allowed(res)
    }

    fn post(self, req: http::Request, res: http::ResponseStarter<THttpWriter>) -> IoResult<()> {
        self.method_not_allowed(res)
    }

    fn method_not_allowed(self, res: http::ResponseStarter<THttpWriter>) -> IoResult<()> {
        let mut resp_writer = try!(res.start(http::Status::MethodNotAllowed));
        resp_writer.write_content("MethodNotAllowed")
    }
}

struct StaticResource {
    filename: String,
}

impl StaticResource {
    fn new(filename: String) -> Box<Resource> {
        Box::new(StaticResource { filename: filename })
    }
}

impl<THttpWriter: Writer> Resource<THttpWriter> for StaticResource {

}


struct NotFoundResource;

impl NotFoundResource {
    fn new(filename: String) -> Box<Resource> {
        Box::new(StaticResource { filename: filename })
    }
}

impl<THttpWriter: Writer> Resource<THttpWriter> for NotFoundResource {

}



struct DbResource {
    database: String,
}







struct DbHandler<THttpWriter: Writer> {
    req: http::Request,
    res: http::ResponseStarter<THttpWriter>,
    dbconn: postgres::DatabaseConnection<TcpStream>,
}

impl<THttpWriter: Writer> DbHandler<THttpWriter> {
    fn handle_index(mut self) -> IoResult<()> {
        use serialize::json;
        use serialize::json::Json;
        use std::collections::BTreeMap;

        let rows = self.dbconn.execute_query("
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


        let mut resp_writer = try!(self.res.start_ok());
        try!(resp_writer.write_content_type("text/html"));
        try!(resp_writer.write_content(index_html.as_bytes()));

        Ok(())
    }



    fn handle_script_req<TView: View>(mut self) -> IoResult<()> {

        let script = match self.req.content {
            Some(http::RequestContent::UrlEncoded(ref params)) => {
                params.iter()
                    .find(|x| x.0 == "sql_script")
                    .unwrap()
                    .1
                    .as_slice()
            },
            _ => panic!("bad request"),
        };




        // let server_conn = try!(postgres::connect_tcp("localhost:5432"));
        // let dbconn_res = server_conn.connect_database(
        //     "postgres", &user[], &password[]
        // );

        // let mut dbconn = match dbconn_res {
        //     Ok(conn) => conn,
        //     Err(postgres::ConnectError::AuthenticationFailed) => {
        //         return self.handle_unauthorized_req();
        //     },
        //     Err(e) => { println!("{:?}", e); panic!("err"); },
        // };

        let mut a = try!(self.res.start_ok());
        try!(a.write_content_type("text/html"));
        let writer = &mut try!(a.start_chunked());

        {
            let mut view = TableView(writer.by_ref());
            for r in try!(self.dbconn.execute_script(script)) {
                use postgres::ScriptResultItem::*;
                try!(match r.unwrap() {
                    RowsetBegin(cols_descr) => view.render_rowset_begin(&cols_descr[]),
                    RowsetEnd => view.render_rowset_end(),
                    Row(row) => view.render_row(&row[]),
                    NonQuery(cmd) => view.render_nonquery(&cmd[]),
                    Error(err) => view.render_error(err),
                    Notice(notice) => view.render_error(notice),
                });
            }
        }

        try!(writer.write(b"\r\n"));
        try!(writer.end());

        self.dbconn.finish()
    }

    fn handle_node_req(self, action: &str, nodetype: &str, nodeid: &str) -> IoResult<()> {
        // let node_service = NodeService {
        //     dbconn: self.dbconn,
        //     nodeid: nodeid.to_string(),
        //     nodetype: nodetype.to_string(),

        // };
           //     use serialize::json;

    //     let children = tree::NodeService {
    //         dbconn: dbconn,
    //         nodeid: nodeid,
    //         nodetype: nodetype,
    //     }.get_children().unwrap();

    //     let mut a = try!(self.res.start_ok());
    //     try!(a.write_content_type("application/json"));
    //     try!(a.write_content(json::encode(&children).as_bytes()));

        match action {
            "children" => {},
            "definition" => {},
            _ => {},
        };

        Ok(())
    }

    fn handle_not_found(self) -> IoResult<()> {
        use http::Status::NotFound;
        let mut a = try!(self.res.start(NotFound));
        try!(a.write_content_type("text/plain"));
        try!(a.write_content(b"Not Found"));

        Ok(())
    }
}




// trait DatabaseAction<TStream: Stream> {
//     fn get_database_name(self) -> String;
//     fn consume_db_connection(self, DatabaseConnection<TStream>) -> IoResult<()>;
// }











trait View {
    fn render_rowset_begin(&mut self, &[postgres::ColumnDescription]) -> IoResult<()>;
    fn render_rowset_end(&mut self) -> IoResult<()>;
    fn render_row(&mut self, &[Option<String>]) -> IoResult<()>;
    fn render_error(&mut self, postgres::ErrorOrNotice) -> IoResult<()>;
    fn render_nonquery(&mut self, &str) -> IoResult<()>;
}

struct TableView<T: Writer>(T);

impl<T: Writer> View for TableView<T> {
    fn render_rowset_begin(&mut self, cols_descr: &[postgres::ColumnDescription]) -> IoResult<()> {
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

    fn render_error(&mut self, err: postgres::ErrorOrNotice) -> IoResult<()> {
        write!(&mut self.0, "<pre>{:?}</pre>", err)
    }

    fn render_nonquery(&mut self, cmd: &str) -> IoResult<()> {
        write!(&mut self.0, "<pre>{}</pre>", cmd)
    }
}


fn main() {

    http::serve_forever_tcp("0.0.0.0:7890", Controller::handle_req);

    //pg_talk().unwrap();

    // for stmt_result in postgres::execute_script(dsn, script) {
    //     match stmt_result {
    //         NonQueryResult(tag) => println!("{}", tag),
    //         Rowset(row_descr, rows) => {
    //             for row in rows {
    //                 println!("{}", row);
    //             }
    //         }
    //     }
    // }


    // let conn_params = postgres::ConnectParams {
    //     database: "postgres".to_string(),
    //     host: "localhost".to_string(),
    //     port: 5432,
    //     user: "xed".to_string(),
    //     password: "passpass".to_string(),
    // };



    // match postgres::connect(conn_params) {
    //     Ok(conn) => println!("connected"),
    //     _ => println!("alalala")
    // };

    //let mut buf = [0];
    //let _ = stream.read(&mut buf); // ignore here too
}


// fn pg_talk() -> IoResult<()> {

//     let mut conn = try!(postgres::connect_tcp("localhost:5432"));

//     try!(conn.connect_database("postgres", "xed", "passpass"));


//     let script = "
//         begin;

//         create function raise_notice() returns text language plpgsql as $$
//         begin
//             raise warning 'hello';
//             return 'hello_ret';
//         end
//         $$;

//         select raise_notice()
//         union all
//         select raise_notice();

//         rollback;
//     ";


//     // let mut result_iter =
//     //     // " select 1.0/generate_series(-10, 10);
//     //     //  select * from pg_database limit 10;
//     //     //  --select * from not_existing;
//     //     //  select 1/0;
//     //     //  select array['1', '\"2\"'];
//     //     //  begin;"



//     // ));


//     for res in try!(conn.execute_script(script)) {

//         println!("{:?}", res.unwrap());
//         // match maybe_message {
//         //     Some(postgres::BackendMessage::ReadyForQuery(..))
//         // }
//     }

//     try!(conn.finish());

//     // loop {
//     //     match try!(conn.next_result()) {
//     //         Some(postgres::StatementResult::Rowset(description)) => {
//     //             let mut count = 0i;
//     //             loop {
//     //                 match try!(conn.fetch_row()) {
//     //                     Some(row) => { count += 1; },
//     //                     None => break
//     //                 }
//     //             }
//     //             println!("count = {}", count);
//     //         },
//     //         Some(postgres::StatementResult::NonQuery(tag)) => {

//     //         },
//     //         None => break
//     //     }
//     // }



//     Ok(())
// }






