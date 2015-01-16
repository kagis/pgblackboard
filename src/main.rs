#![allow(unstable)]

extern crate serialize;


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



struct Controller<'a, THttpWriter: Writer> {
    req: &'a http::Request,
    res: http::ResponseStarter<THttpWriter>,
}

impl<'a, THttpWriter: Writer> Controller<'a, THttpWriter> {

    fn handle_req(req: http::Request, res: http::ResponseStarter<THttpWriter>) -> IoResult<()> {
        use http::Method::{ Get, Post };

        let ctrl = Controller { req: &req, res: res };

        match (req.method, &req.path[]) {
            (Get, "/") => ctrl.handle_db_req(Controller::handle_index_req),
            (Get, "/favicon.ico") => ctrl.handle_static_req("/static/favicon.ico"),
            (Get, path) if path.starts_with("/static/") => ctrl.handle_static_req(path),
            (Post, "/") => ctrl.handle_db_req(Controller::handle_script_req),
            _ => ctrl.handle_not_found(),
        }
    }


    fn handle_not_found(self) -> IoResult<()> {
        use http::Status::NotFound;
        let mut a = try!(self.res.start(NotFound));
        try!(a.write_content_type("text/plain"));
        try!(a.write_content(b"Not Found"));

        Ok(())
    }

    fn handle_index_req(self, mut dbconn: postgres::DatabaseConnection<TcpStream>) -> IoResult<()> {
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


        let mut resp_writer = try!(self.res.start_ok());
        try!(resp_writer.write_content_type("text/html"));
        try!(resp_writer.write_content(index_html.as_bytes()));

        Ok(())
    }

    fn handle_static_req(self, path: &str) -> IoResult<()> {
        use std::io::File;
        use std::path::Path;

        let path: String = ["src", path].concat();

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

    fn handle_db_req<TConnConsumer>(self, consumer: TConnConsumer) -> IoResult<()>
        where TConnConsumer: Fn(Self, postgres::DatabaseConnection<TcpStream>) -> IoResult<()>
    {
        let &(ref user, ref password) = match self.req.basic_auth {
            Some(ref x) => x,
            None => return self.handle_unauthorized_req(),
        };

        let server_conn = try!(postgres::connect_tcp("localhost:5432"));

        let dbconn_res = server_conn.connect_database("postgres",
                                                      &user[],
                                                      &password[]);

        let dbconn = match dbconn_res {
            Ok(conn) => conn,
            Err(postgres::ConnectError::AuthenticationFailed) => {
                return self.handle_unauthorized_req();
            },
            Err(e) => { println!("{:?}", e); panic!("err"); },
        };

        consumer(self, dbconn)
    }


    fn handle_script_req(self, mut dbconn: postgres::DatabaseConnection<TcpStream>) -> IoResult<()> {

        // let &(ref user, ref password) = match self.req.basic_auth {
        //     Some(ref x) => x,
        //     None => return self.handle_unauthorized_req(),
        // };

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
            for r in try!(dbconn.execute_script(script)) {
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

        dbconn.finish()
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






