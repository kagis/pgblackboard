#![allow(unstable)]

//extern crate hyper;
//extern crate postgres;

//use std::io::net::ip::Ipv4Addr;
//use hyper::server::{Request, Response};
//use postgres::{Connection, SslMode};

use std::io::{
    // TcpListener,
    // TcpStream,
    IoResult,
    // Listener,
    ByRefWriter,
};

mod postgres;
mod http;

fn handle_req<T: Writer>(req: http::Request, res: http::Response<T>) {
    use http::Method::{ Get, Post };
    use http::Status;
    use http::AuthenticationScheme;




    match (req.method, &req.path[]) {
        (Get, "/") =>  handle_index(res).unwrap(),
        (Post, "/") => handle_pg_req(req, res).unwrap(),

            // match req.basic_auth {
            //     Some((user, password)) => ,
            //     None =>  handle_unauthorized_req(res).unwrap(),
            // }

            // let mut writer = res.start_chunked(http::Status::Unauthorized, &[
            //     ("WWW-Authenticate", "Basic"),
            //     ("Content-type", "text/html"),
            // ]).unwrap();
            // handle_pg_req(&mut writer).unwrap();
            // writer.end().unwrap();
        //},
        // (Post, "/") => {
        //     let mut writer = res.start_chunked(http::Status::Ok).unwrap();
        //     writer.write(b"hello").unwrap();
        //     writer.write(b"").unwrap();
        // }
        _ => { }
    }



    // let mut writer = res.start_chunked(http::Status::Ok).unwrap();
    // writer.write(b"hello").unwrap();
    // writer.write(b"").unwrap();
}

fn handle_index<T: Writer>(res: http::Response<T>) -> IoResult<()> {
    use std::io::File;
    use std::path::Path;

    let content = File::open(&Path::new("src/index.html"))
                        .read_to_end()
                        .unwrap();

    let mut a = try!(res.start_ok());
    a.write_content_type("text/html");
    a.write_content(&content[]);

    Ok(())
}


fn handle_unauthorized_req<T: Writer>(res: http::Response<T>) -> IoResult<()> {
    use http::Status::Unauthorized;
    use http::AuthenticationScheme::Basic;

    let mut a = try!(res.start(Unauthorized));
    try!(a.write_www_authenticate(Basic));
    try!(a.write_content_type("text/html"));
    try!(a.write_content(b"ololo"));
    Ok(())
}


fn handle_pg_req<T: Writer>(req: http::Request, res: http::Response<T>) -> IoResult<()> {
    if let Some((user, password)) = req.basic_auth {
        match req.content {
            Some(http::RequestContent::UrlEncoded(params)) => {
                let script = params.iter()
                    .find(|x| x.0 == "script")
                    .unwrap()
                    .1
                    .as_slice();

                handle_pg_authorized_req(
                    &user[],
                    &password[],
                    &script[],
                    res
                )
            },
            _ => panic!("bad request"),
        }

    } else {
        handle_unauthorized_req(res)
    }
}

fn handle_pg_authorized_req<T: Writer>(
    user: &str,
    password: &str,
    script: &str,
    res: http::Response<T>
    ) -> IoResult<()>
{
    use postgres::ScriptResultItem::*;

    let mut conn = try!(postgres::connect_tcp("localhost", 5432));


    try!(conn.connect_database("postgres", &user[], &password[]));

    let mut a = try!(res.start_ok());
    try!(a.write_content_type("text/html"));
    let writer = &mut try!(a.start_chunked_content());



    // let script = "
    //     begin;

    //     create function raise_notice() returns text language plpgsql as $$
    //     begin
    //         raise warning 'hello';
    //         return 'hello_ret';
    //     end
    //     $$;

    //     select raise_notice()
    //     union all
    //     select raise_notice();

    //     select pg_sleep(5);

    //     select * from pg_database;

    //     rollback;
    // ";


    // let mut result_iter =
    //     // " select 1.0/generate_series(-10, 10);
    //     //  select * from pg_database limit 10;
    //     //  --select * from not_existing;
    //     //  select 1/0;
    //     //  select array['1', '\"2\"'];
    //     //  begin;"



    // ));

    {
        let mut view = TableView(writer.by_ref());
        for r in try!(conn.execute_script(script)) {
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

    conn.finish()
}


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

    http::serve_forever_tcp("127.0.0.1:8080", handle_req);

    pg_talk().unwrap();

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


fn pg_talk() -> IoResult<()> {

    let mut conn = try!(postgres::connect_tcp("localhost", 5432));

    try!(conn.connect_database("postgres", "xed", "passpass"));


    let script = "
        begin;

        create function raise_notice() returns text language plpgsql as $$
        begin
            raise warning 'hello';
            return 'hello_ret';
        end
        $$;

        select raise_notice()
        union all
        select raise_notice();

        rollback;
    ";


    // let mut result_iter =
    //     // " select 1.0/generate_series(-10, 10);
    //     //  select * from pg_database limit 10;
    //     //  --select * from not_existing;
    //     //  select 1/0;
    //     //  select array['1', '\"2\"'];
    //     //  begin;"



    // ));


    for res in try!(conn.execute_script(script)) {

        println!("{:?}", res.unwrap());
        // match maybe_message {
        //     Some(postgres::BackendMessage::ReadyForQuery(..))
        // }
    }

    try!(conn.finish());

    // loop {
    //     match try!(conn.next_result()) {
    //         Some(postgres::StatementResult::Rowset(description)) => {
    //             let mut count = 0i;
    //             loop {
    //                 match try!(conn.fetch_row()) {
    //                     Some(row) => { count += 1; },
    //                     None => break
    //                 }
    //             }
    //             println!("count = {}", count);
    //         },
    //         Some(postgres::StatementResult::NonQuery(tag)) => {

    //         },
    //         None => break
    //     }
    // }



    Ok(())
}






