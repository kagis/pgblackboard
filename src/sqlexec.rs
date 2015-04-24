extern crate flate2;

use self::flate2::write::GzEncoder;
use self::flate2::Compression;

use std::io::{self, Write, BufWriter};
use std::cmp;
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
            sel_anchor_line: Option<usize>,
            sel_anchor_col: Option<usize>,
            sel_head_line: Option<usize>,
            sel_head_col: Option<usize>
        }

        let form = match req.decode_urlencoded_form::<Form>() {
            Ok(form) => form,
            Err(err) => {
                println!("Failed to decode form: {:?}", err);
                return Box::new(SqlExecErrorResponse {
                    status: http::Status::BadRequest,
                    message: "Failed to decode form."
                })
            }
        };

        let maybe_selrange = if let Form {
            sel_anchor_line: Some(sel_anchor_line),
            sel_anchor_col: Some(sel_anchor_col),
            sel_head_line: Some(sel_head_line),
            sel_head_col: Some(sel_head_col),
            ..
        } = form {
            Some(Range {
                start: LineCol {
                    line: cmp::min(sel_anchor_line, sel_head_line),
                    col: cmp::min(sel_anchor_col, sel_head_col),
                },
                end: LineCol {
                    line: cmp::max(sel_anchor_line, sel_head_line),
                    col: cmp::max(sel_anchor_col, sel_head_col)
                },
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
                    status: http::Status::Ok,
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
            // selrange: selrange,

            sqlscript: maybe_selrange.as_ref().map_or(
                sqlscript_and_dbname.sqlscript,
                |selrange| &form.sqlscript[selrange.start.to_pos(&form.sqlscript)..selrange.end.to_pos(&form.sqlscript)]
            ).to_string(),

            sqlscript_offset: maybe_selrange.map_or(
                sqlscript_and_dbname.sqlscript_linecol,
                |it| it.start
            )
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
#[derive(Clone, Copy)]
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
        let mut lines = s.split('\n');
        LineCol {
            col: lines.next_back().map(|ln| ln.len()).unwrap_or(0),
            line: lines.count(),
        }
    }

    fn to_bytepos(self, s: &str) -> usize {
        let mut current_line = 0usize;
        for (pos, ch) in s.char_indices() {
            if ch == '\n' {
                current_line += 1;
                current_col = 0;
                continue;
            }


        }

        let zero_col_at_line_pos = s.split('\n')
            .take(self.line)
            .map(|line| line.len() + 1)
            .sum::<usize>();

        let mut col_pos = 0usize;
        for (i, ch) in s[zero_col_at_line_pos..].char_indices() {
            if i == self.col {
                return col_pos + zero_col_at_line_pos;
            }
            col_pos += ch.len_utf8();
        }

        panic!("{}", col_pos);
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

#[test]
fn test_linecol_to_pos() {
    let text = "abc\r\nбв\nгд";
    assert_eq!(&text[LineCol { line: 1, col: 1 }.to_pos(text)..], "в\nгд");
    //assert_eq!(&text[LineCol { line: 2, col: 1 }.to_pos(text)..], "д");
}

struct SqlExecResponse {
    dbconn: pg::Connection,
    map_or_table: MapOrTable,
    sqlscript: String,
    sqlscript_offset: LineCol,
    // selrange: Option<Range<LineCol>>,
}

impl http::Response for SqlExecResponse {
    fn write_to(self: Box<Self>, w: http::ResponseStarter) -> io::Result<()> {
        let self_ = *self;
        let SqlExecResponse {
            mut dbconn,
            map_or_table,
            sqlscript,
            sqlscript_offset,
            // selrange,
        } = self_;

        let execution_events = dbconn.execute_script(&sqlscript).unwrap();

        let mut w = try!(w.start(http::Status::Ok));
        try!(w.write_content_type("text/html; charset=utf-8"));
        // try!(w.write_header("Content-Encoding", "gzip"));

        let mut w = try!(w.start_chunked());
        //let mut w = GzEncoder::new(w, Compression::Fast);
        //let mut w = BufWriter::new(w);

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

        //let mut w = try!(w.into_inner());
        //let mut w = try!(w.finish());

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
    pat.captures(sqlscript).map(|captures| {
        let dbname_pos = captures.pos(1).unwrap().0;
        let sqlscript_pos = captures.pos(2).unwrap().0;
        SqlScriptAndDbName {
            dbname: captures.at(1).unwrap(),
            dbname_linecol: LineCol::end_of_str(&sqlscript[..dbname_pos]),
            sqlscript: captures.at(2).unwrap(),
            sqlscript_linecol: LineCol::end_of_str(&sqlscript[..sqlscript_pos])
        }
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
        sqlscript_linecol: LineCol { line: 1, col: 0 }
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

    // fn flush(&self) -> io::Result<()>;
}


struct FieldDescription<'a, 'b> {
    pub name: &'a str,
    pub typ: &'b str,
    pub is_numeric: bool,
}


static INTRO: &'static [u8] = b"\
    <!DOCTYPE html>\
    <html>\
    <head>\
        <meta charset='utf-8' />\
        <title></title>\
    </head>\
    <body>\
        <script>frameElement.setupPgBlackboardOutputFrame('table');</script>\
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
        try!(writer.write_all(INTRO));
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
        try!(out.write_all(b"<thead>"));
        try!(out.write_all(b"<tr>"));
        try!(out.write_all(b"<th class='rowset-corner'></th>"));
        for col in cols_descr {
            try!(write!(out,
                "<th class='rowset-colheader'>\
                    {colname}\
                    <small class='rowset-coltype'>\
                        {coltype}\
                    </small>\
                </th>",
                colname = col.name,
                coltype = col.typ));
        }
        try!(out.write_all(b"</tr>"));
        try!(out.write_all(b"</thead>"));
        try!(out.write_all(b"<tbody>"));
        try!(out.flush());
        Ok(())
    }

    fn render_rowset_end(&mut self) -> io::Result<()> {
        let writer = &mut self.writer;
        try!(writer.write_all(b"</tbody>"));
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
        try!(writer.write_all(b"<pre class=\"message message--error\">"));
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

    // fn flush(&self) -> io::Result<()> {
    //     self.writer.flush()
    // }
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
        "<script>pgBlackboard.setError({{\
            \"message\":\"{message}\",\
            \"line\":{line}\
        }});</script>",
       message = message.replace("\"", "\\\""),
       line = script_line)
}
