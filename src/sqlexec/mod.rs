extern crate flate2;

mod linecol;
use self::linecol::LineCol;

mod view;

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
            let anchor = LineCol {
                line: sel_anchor_line,
                col: sel_anchor_col
            };

            let head = LineCol {
                line: sel_head_line,
                col: sel_head_col
            };

            Some(Range {
                start: cmp::min(anchor, head),
                end: cmp::max(anchor, head)
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

            let maybe_dbconn = pg::connect(self.pgaddr,
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

            sqlscript: match maybe_selrange.as_ref() {
                None => sqlscript_and_dbname.sqlscript,
                Some(selrange) => {
                    let start_bpos = match selrange.start.to_bytepos(&form.sqlscript) {
                        Some(bpos) => bpos,
                        None => return Box::new(SqlExecErrorResponse {
                            status: http::Status::BadRequest,
                            message: "Selection is out of range."
                        })
                    };

                    let end_bpos = match selrange.end.to_bytepos(&form.sqlscript) {
                        Some(bpos) => bpos,
                        None => return Box::new(SqlExecErrorResponse {
                            status: http::Status::BadRequest,
                            message: "Selection is out of range."
                        })
                    };

                    &form.sqlscript[start_bpos..end_bpos]
                }
            }.to_string(),

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
            use self::view::View;
            let mut view = view::TableView::new(&mut w);
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

        println!("executing: {:?}", &sqlscript);
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
                view::TableView::new(&mut w),
                &sqlscript,
                sqlscript_offset
            ),

            MapOrTable::Map => dispatch_exec_events(
                execution_events,
                view::MapView::new(&mut w),
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
          TView: view::View
{
    use self::view::View;

    try!(view.render_intro());

    let mut latest_rowset_id = 0;

    // loop {
    //     match execution_events.next() {
    //         pg::ExecutionEvent::RowsetBegin(cols_descr) => {
    //             latest_rowset_id += 1;

    //             try!(view.render_rowset_begin(latest_rowset_id, &cols_descr.iter().map(|x| view::FieldDescription {
    //                 name: &x.name,
    //                 typ: match pg::type_name(x.type_oid) {
    //                     Some(typ) => typ,
    //                     None => "---"
    //                 },
    //                 is_numeric: pg::type_isnum(x.type_oid)
    //             }).collect::<Vec<_>>())

    //             loop {
    //                 match execution_events.next() {
    //                     pg::ExecutionEvent::RowsetEnd => {
    //                         view.render_rowset_end()
    //                     }

    //                     pg::ExecutionEvent::RowFetched(row) => {
    //                         let row_iter = row.iter().map(|maybe_val| {
    //                             maybe_val.as_ref().map(|val| &val[..])
    //                         });
    //                         view.render_row(row_iter, )
    //                     }
    //                 }
    //             }
    //         }
    //     }
    // }

    let mut lastest_cols_descr = None;

    for event in execution_events {
        try!(match event {
            pg::ExecutionEvent::RowsetBegin(cols_descr) => {
                latest_rowset_id += 1;
                let retval = view.render_rowset_begin(latest_rowset_id, &cols_descr.iter().map(|x| view::FieldDescription {
                    name: &x.name,
                    typ: match pg::type_name(x.type_oid) {
                        Some(typ) => typ,
                        None => "---"
                    },
                    is_numeric: pg::type_isnum(x.type_oid)
                }).collect::<Vec<_>>());
                lastest_cols_descr = Some(cols_descr);
                retval
            }

            pg::ExecutionEvent::RowsetEnd => {
                view.render_rowset_end()
            }

            pg::ExecutionEvent::RowFetched(row) => {
                let row_iter = row.iter().map(|maybe_val| {
                    maybe_val.as_ref().map(|val| &val[..])
                });
                let cols_descr = lastest_cols_descr
                    .as_ref()
                    .expect("Row fetched before rowset started.");

                view.render_row(row_iter, cols_descr)
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