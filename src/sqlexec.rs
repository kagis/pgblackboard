use std::io::{self, Write};
use std::ops::Range;
use http;
use pg;

pub struct SqlExecHandler<'a> {
    pub pgaddr: &'a str
}

impl<'a> http::Handler for SqlExecHandler<'a> {

    fn handle_http_req(&self,
                       _: &[&str],
                       req: &http::Request)
                       -> Box<http::Response>
    {
        #[derive(RustcDecodable)]
        #[derive(Debug)]
        struct Form {
            view: Option<MapOrTable>,
            sqlscript: String,
            sel_start_line: Option<usize>,
            sel_start_col: Option<usize>,
            sel_end_line: Option<usize>,
            sel_end_col: Option<usize>
        }

        let form = match req.decode_urlencoded_form::<Form>() {
            Ok(form) => form,
            Err(err) => return Box::new(SqlExecErrorResponse {
                status: http::Status::BadRequest,
                message: "Failed to decode form." // format!("{:?}", err)
            })
        };

        let selrange = if let Form {
            sel_start_line: Some(sel_start_line),
            sel_start_col: Some(sel_start_col),
            sel_end_line: Some(sel_end_line),
            sel_end_col: Some(sel_end_col),
            ..
        } = form {
            Some(Range {
                start: LineCol { line: sel_start_line, col: sel_start_col },
                end: LineCol { line: sel_end_line, col: sel_end_col },
            })
        } else {
            None
        };

        let sqlscript_and_dbname = match extract_connect_metacmd(&form.sqlscript) {
            Some(res) => res,
            None => return Box::new(SqlExecErrorResponse {
                status: http::Status::Ok,
                message: "\\connect dbname expected on first line."
            })
        };

        let dbconn = {
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
                None => return Box::new(SqlExecErrorResponse {
                    status: Unauthorized,
                    message: "Username and password requried."
                })
            };

            let maybe_dbconn = pg::connect(&self.pgaddr[..],
                                           sqlscript_and_dbname.dbname,
                                           user, passwd);

            match maybe_dbconn {

                Ok(dbconn) => dbconn,

                Err(AuthFailed) => return Box::new(SqlExecErrorResponse {
                    status: Unauthorized,
                    message: "Invalid username or password."
                }),

                Err(DatabaseNotExists) => return Box::new(SqlExecErrorResponse {
                    status: NotFound,
                    message: "Database not exists."
                }),

                Err(err) => {
                    println!("error while connecting to db: {:?}", err);
                    return Box::new(SqlExecErrorResponse {
                        status: InternalServerError,
                        message: "Failed to connect database, see logs for details."
                    });
                }
            }
        };


        Box::new(SqlExecResponse {
            dbconn: dbconn,
            map_or_table: form.view.unwrap_or(MapOrTable::Table),
            selrange: selrange,
            sqlscript: sqlscript_and_dbname.sqlscript.to_string(),
            sqlscript_offset: sqlscript_and_dbname.sqlscript_linecol,
        })

        // Box::new(JsonResponse {
        //     status: http::Status::Ok,
        //     content: format!("Got form\r\n{:?}", form)
        // })
    }
}


struct SqlExecErrorResponse {
    status: http::Status,
    message: &'static str
}

impl http::Response for SqlExecErrorResponse {
    fn write_to(self: Box<Self>, w: http::ResponseStarter) -> io::Result<()> {

        let mut w = try!(w.start(self.status));
        try!(w.write_content_type("text/html; charset=utf-8"));

        if self.status == http::Status::Unauthorized {
            try!(w.write_www_authenticate_basic("postgres"));
        }

        let mut w = try!(w.start_chunked());
        {
            let mut view = TableView::new(&mut w);
            try!(view.render_intro());
            try!(view.render_error(&self.message, 0, 0));
            try!(view.render_outro());
        }
        w.end()
    }
}


#[derive(RustcDecodable)]
#[derive(Debug)]
enum MapOrTable {
    Map,
    Table
}

#[derive(Debug)]
#[derive(PartialEq)]
#[derive(Clone, Copy)]
struct LineCol {
    line: usize,
    col: usize,
}

impl LineCol {
    fn end_of_str(s: &str) -> LineCol {
        let mut lines = s.lines();
        LineCol {
            col: lines.next_back().map(|ln| ln.len()).unwrap_or(0),
            line: lines.count(),
        }
    }


}


#[test]
fn test_linecol() {
    assert_eq!(LineCol::end_of_str("a\nb"), LineCol {
        line: 1,
        col: 1
    });

    assert_eq!(LineCol::end_of_str("one\ntwo\nthree"), LineCol {
        line: 2,
        col: 5
    });

    assert_eq!(LineCol::end_of_str("one\r\ntwo\r\nthree"), LineCol {
        line: 2,
        col: 5
    });

    assert_eq!(LineCol::end_of_str(""), LineCol {
        line: 0,
        col: 0
    });
}

struct SqlExecResponse {
    dbconn: pg::Connection,
    map_or_table: MapOrTable,
    sqlscript: String,
    sqlscript_offset: LineCol,
    selrange: Option<Range<LineCol>>,
}

impl http::Response for SqlExecResponse {
    fn write_to(self: Box<Self>, w: http::ResponseStarter) -> io::Result<()> {
        let self_ = *self;
        let SqlExecResponse {
            mut dbconn,
            map_or_table,
            sqlscript,
            sqlscript_offset,
            selrange,
        } = self_;

        let execution_events = dbconn.execute_script(&sqlscript).unwrap();

        let mut w = try!(w.start(http::Status::Ok));
        try!(w.write_content_type("text/html; charset=utf-8"));
        let mut w = try!(w.start_chunked());

        try!(match map_or_table {

            MapOrTable::Table => dispatch_exec_events(
                execution_events,
                TableView::new(&mut w),
                &sqlscript,
                sqlscript_offset
            ),

            MapOrTable::Map => dispatch_exec_events(
                execution_events,
                TableView::new(&mut w),
                &sqlscript,
                sqlscript_offset
            )
        });

        w.end()
    }
}


fn dispatch_exec_events<TEventsIter, TView>(execution_events: TEventsIter,
                                            mut view: TView,
                                            sqlscript: &str,
                                            sqlscript_offset: LineCol)
                                            -> io::Result<()>
    where TEventsIter: Iterator<Item=pg::ExecutionEvent>,
          TView: View
{

    try!(view.render_intro());

    let mut latest_rowset_id = 0;
    for event in execution_events {
        try!(match event {
            pg::ExecutionEvent::RowsetBegin(cols_descr) => {
                latest_rowset_id += 1;
                view.render_rowset_begin(latest_rowset_id, &cols_descr.iter().map(|x| FieldDescription {
                    name: &x.name,
                    typ: "typ",
                    is_numeric: false
                }).collect::<Vec<_>>())
            }

            pg::ExecutionEvent::RowsetEnd => {
                view.render_rowset_end()
            }

            pg::ExecutionEvent::RowFetched(row) => {
                let row_iter = row.iter().map(|maybe_val| {
                    maybe_val.as_ref().map(|val| &val[..])
                });
                view.render_row(row_iter)
            }

            pg::ExecutionEvent::NonQueryExecuted(cmd) => {
                view.render_nonquery(&cmd)
            }

            pg::ExecutionEvent::SqlErrorOccured(err) => {

                let linecol = err.position.map(|pos| {
                    let mut linecol = LineCol::end_of_str(&sqlscript[..pos]);
                    linecol.line += sqlscript_offset.line;
                    linecol
                });

                view.render_error(&err.message,
                                  linecol.map(|x| x.line).unwrap_or(0),
                                  linecol.map(|x| x.col).unwrap_or(0))
            }

            pg::ExecutionEvent::IoErrorOccured(err) => {
                view.render_error(&err, 0, 0)
            }

            pg::ExecutionEvent::Notice(notice) => {
                view.render_notice(&notice.message)
            }
        });
    }

    try!(view.render_outro());

    Ok(())
}




#[derive(Debug, PartialEq)]
struct SqlScriptAndDbName<'a> {
    dbname: &'a str,
    dbname_linecol: LineCol,
    sqlscript: &'a str,
    sqlscript_linecol: LineCol
}

fn extract_connect_metacmd(sqlscript: &str) -> Option<SqlScriptAndDbName> {
    let pat = regex!(r"(?ms)^\s*\\c(?:onnect)?[ \t]+(\w+)[ \t]*[\r\n]+(.*)");
    pat.captures(sqlscript).map(|captures| SqlScriptAndDbName {
        dbname: captures.at(1).unwrap(),
        dbname_linecol: LineCol::end_of_str(&sqlscript[..captures.pos(1).unwrap().0]),
        sqlscript: captures.at(2).unwrap(),
        sqlscript_linecol: LineCol::end_of_str(&sqlscript[..captures.pos(2).unwrap().0])
    })
}

#[test]
fn test_extract_connect_metacmd() {
    let result = extract_connect_metacmd(
        "\\connect postgres\nselect 'awesome'"
    );

    assert_eq!(result, Some(SqlScriptAndDbName {
        dbname: "postgres",
        dbname_linecol: LineCol { line: 0, col: 9 },
        sqlscript: "select 'awesome'",
        sqlscript_linecol: LineCol { line: 0, col: 17 }
    }));
}





trait View {

    fn render_intro(&mut self) -> io::Result<()>;

    fn render_outro(&mut self) -> io::Result<()>;

    fn render_rowset_begin(&mut self,
                           rowset_id: i32,
                           &[FieldDescription])
                           -> io::Result<()>;

    fn render_rowset_end(&mut self) -> io::Result<()>;

    fn render_row<'a, T>(&mut self, row: T) -> io::Result<()>
        where T: Iterator<Item=Option<&'a str>>;

    fn render_notice(&mut self,
                     message: &str)
                     -> io::Result<()>;

    fn render_error(&mut self,
                    message: &str,
                    script_line: usize,
                    script_col: usize)
                    -> io::Result<()>;

    fn render_nonquery(&mut self,
                       command_tag: &str)
                       -> io::Result<()>;

    fn make_rowset_editable(&mut self,
                            rowset_id: i32,
                            table_name: &str,
                            col_names: &[&str],
                            pk_mask: &[bool])
                            -> io::Result<()>;
}




struct FieldDescription<'a, 'b> {
    pub name: &'a str,
    pub typ: &'b str,
    pub is_numeric: bool,
}


static INTRO_START: &'static [u8] = b"\
    <!DOCTYPE html>\
    <html>\
    <head>\
        <meta charset='utf-8' />\
        <title></title>\
";

static INTRO_END: &'static [u8] = b"\
    </head>\
    <body>\
        <script>frameElement.setupPgBlackboardOutputFrame();</script>\
        <div class='main'>\
";


struct TableView<W: Write> {
    writer: W
}

impl<W: Write> TableView<W> {
    fn new(writer: W) -> TableView<W> {
        TableView { writer: writer }
    }
}

impl<W: Write> View for TableView<W> {

    fn render_intro(&mut self) -> io::Result<()> {
        let ref mut writer = self.writer;
        try!(writer.write_all(INTRO_START));
        try!(writer.write_all(b"\
            <link href='table.css' rel='stylesheet' />\
            <script src='table.js' async='async'></script>"));
        try!(writer.write_all(INTRO_END));
        Ok(())
    }

    fn render_outro(&mut self) -> io::Result<()> {
        self.writer.write_all(b"</div></body></html>\r\n")
    }

    fn render_rowset_begin(&mut self,
                           rowset_id: i32,
                           cols_descr: &[FieldDescription])
                           -> io::Result<()>
    {
        let out = &mut self.writer;

        let numeric_cols = cols_descr.iter()
                                     .enumerate()
                                     .filter(|&(_, col)| col.is_numeric)
                                     .map(|(i, _)| i + 1);

        try!(out.write_all(b"<style>"));
        for i in numeric_cols {
            try!(write!(out, "#rowset{} td:nth-child({}),", rowset_id, i));
        }
        try!(out.write_all(b"{ text-align: right; }"));
        try!(out.write_all(b"</style>"));

        try!(write!(out, "<table class='rowset' id='rowset{}'>", rowset_id));
        try!(out.write_all(b"<tr>"));
        try!(out.write_all(b"<th class='rowset-corner'></th>"));
        for col in cols_descr {
            try!(write!(out,
                "<th class='rowset-colheader'>\
                    {colname}\
                    <small class='rowset-coltype'>\
                        {coltype}\
                    </small>\
                <th>",
                colname = col.name,
                coltype = col.typ));
        }
        try!(out.write_all(b"</tr>"));
        Ok(())
    }

    fn render_rowset_end(&mut self) -> io::Result<()> {
        let writer = &mut self.writer;
        try!(writer.write_all(b"</table>"));
        Ok(())
    }

    fn make_rowset_editable(&mut self,
                            rowset_id: i32,
                            table_name: &str,
                            col_names: &[&str],
                            pk_mask: &[bool])
                            -> io::Result<()>
    {
        try!(write!(&mut self.writer, "<script>pgBlackboard\
                                .makeRowsetEditable();\
                                </script>"));

        Ok(())
    }

    fn render_row<'a, T>(&mut self, row: T) -> io::Result<()>
        where T: Iterator<Item=Option<&'a str>> {

        let writer = &mut self.writer;
        try!(writer.write_all(b"<tr>"));
        try!(writer.write_all(b"<th></th>"));
        for maybe_val in row {
            try!(match maybe_val {
                Some("") => writer.write_all(b"<td class='emptystr'></td>"),
                Some(val) => write!(writer, "<td>{}</td>", val),
                None => writer.write_all(b"<td></td>"),
            });
        }
        try!(writer.write_all(b"</tr>"));
        Ok(())
    }

    fn render_error(&mut self,
                    message: &str,
                    script_line: usize,
                    script_col: usize)
                    -> io::Result<()>
    {
        let writer = &mut self.writer;
        try!(invoke_js_set_error(writer, message, script_line));
        try!(writer.write_all(b"<pre>"));
        try!(writer.write_all(message.as_bytes()));
        try!(writer.write_all(b"</pre>"));
        Ok(())
    }

    fn render_notice(&mut self, message: &str) -> io::Result<()> {
        let writer = &mut self.writer;
        try!(writer.write_all(b"<pre>"));
        try!(writer.write_all(message.as_bytes()));
        try!(writer.write_all(b"</pre>"));
        Ok(())
    }

    fn render_nonquery(&mut self, command_tag: &str) -> io::Result<()> {
        let writer = &mut self.writer;
        try!(writer.write_all(b"<pre>"));
        try!(writer.write_all(command_tag.as_bytes()));
        try!(writer.write_all(b"</pre>"));
        Ok(())
    }
}


// pub struct MapView<W: Write> {
//     inner: W
// }

// impl<W: Write> View for MapView<W> {

// }



fn invoke_js_set_error<W>(writer: &mut W,
                          message: &str,
                          script_line: usize)
                          -> io::Result<()>
                          where W: Write
{
    write!(writer,
       "<script>pgBlackboard.setError('{message}', {line});</script>",
       message = message.replace("'", "\\'"),
       line = script_line)
}
