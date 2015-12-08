// extern crate flate2;

mod linecol;
mod table;
mod map;

use self::linecol::LineCol;
use self::table::TableView;
use self::map::MapView;
// use self::flate2::write::GzEncoder;
// use self::flate2::Compression;
use std::io::{self, Write, BufWriter};
use std::cmp;
use std::ops::Range;
use std::collections::BTreeSet;
use http;
use dbms::{ Dbms, Field, QueryPlanNode, ExecEvent };
use rustc_serialize::{ Encodable, json };


pub fn handle_sqlexec_req<TDbms: Dbms>(
    dbms: &TDbms,
    req: &http::Request)
    -> Box<http::Response>
{
    http::Handler::handle_http_req(
        &SqlExecEndpoint { dbms: dbms },
        &[],
        req
    )
}

pub struct SqlExecEndpoint<'dbms, TDbms: Dbms + 'dbms> {
    pub dbms: &'dbms TDbms
}

impl<'dbms, TDbms: Dbms + 'dbms> http::Resource for SqlExecEndpoint<'dbms, TDbms> {

    fn post(&self, req: &http::Request) -> Box<http::Response> {

        use http::RequestCredentials::Basic;
        let credentials = match req.credentials.as_ref() {
            Some(&Basic { ref user, ref passwd }) => (&user[..], &passwd[..]),
            // Some(..) => return Box::new(JsonResponse {
            //     status: Unauthorized,
            //     content: "Unsupported authentication scheme"
            // }),
            None => return Box::new(SqlExecErrorResponse {
                status: http::Status::Ok,
                message: "Username and password requried."
            })
        };


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

        let selection = match form {
            Form {
                sel_anchor_line: Some(sel_anchor_line),
                sel_anchor_col: Some(sel_anchor_col),
                sel_head_line: Some(sel_head_line),
                sel_head_col: Some(sel_head_col),
                ref sqlscript,
                ..
            } => {
                let anchor = LineCol {
                    line: sel_anchor_line,
                    col: sel_anchor_col,
                };

                let head = LineCol {
                    line: sel_head_line,
                    col: sel_head_col,
                };

                let anchor_bytepos = match anchor.to_bytepos(sqlscript) {
                    Some(it) => it,
                    None => return Box::new(SqlExecErrorResponse {
                        status: http::Status::BadRequest,
                        message: "Selection anchor is out of range."
                    })
                };

                let head_bytepos = match head.to_bytepos(sqlscript) {
                    Some(it) => it,
                    None => return Box::new(SqlExecErrorResponse {
                        status: http::Status::BadRequest,
                        message: "Selection head is out of range."
                    })
                };

                Some(Range {
                    start: cmp::min(anchor_bytepos, head_bytepos),
                    end: cmp::max(anchor_bytepos, head_bytepos),
                })
            },

            Form {
                sel_anchor_line: None,
                sel_anchor_col: None,
                sel_head_line: None,
                sel_head_col: None,
                ..
            } => None,

            _ => return Box::new(SqlExecErrorResponse {
                status: http::Status::BadRequest,
                message: "sel_anchor_line, sel_anchor_col,
                          sel_head_line and sel_head_col must be
                          set all or nothing."
            }),
        };



        let execiter = self.dbms.execute_script(
            credentials,
            &form.sqlscript,
            selection,
        );


        // let dbconn = {
        //
        //     use http::Status::{
        //         NotFound,
        //         Unauthorized,
        //         InternalServerError,
        //     };
        //     use pg::ConnectionError::{
        //         AuthFailed,
        //         DatabaseNotExists,
        //     };
        //
        //     let maybe_dbconn = pg::connect(self.pgaddr,
        //                                    sqlscript_and_dbname.dbname,
        //                                    user, passwd);
        //
        //     match maybe_dbconn {
        //
        //         Ok(dbconn) => dbconn,
        //
        //         Err(AuthFailed) => return Box::new(SqlExecErrorResponse {
        //             status: Unauthorized,
        //             message: "Invalid username or password."
        //         }),
        //
        //         Err(DatabaseNotExists) => return Box::new(SqlExecErrorResponse {
        //             status: http::Status::Ok,
        //             message: "Database not exists."
        //         }),
        //
        //         Err(err) => {
        //             println!("error while connecting to db: {:?}", err);
        //             return Box::new(SqlExecErrorResponse {
        //                 status: InternalServerError,
        //                 message: "Failed to connect database, see logs for details."
        //             });
        //         }
        //     }
        // };

        Box::new(SqlExecResponse {
            execiter: execiter,
            map_or_table: form.view.unwrap_or(MapOrTable::Table),
            sqlscript: form.sqlscript,
        })
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
            try!(view.render_error(&self.message, None));
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
    Table,
}

struct SqlExecResponse<TExecIter: Iterator<Item=ExecEvent>> {
    execiter: TExecIter,
    map_or_table: MapOrTable,
    sqlscript: String,
}

impl<TExecIter: Iterator<Item=ExecEvent>> http::Response for SqlExecResponse<TExecIter> {
    fn write_to(self: Box<Self>, w: http::ResponseStarter) -> io::Result<()> {
        let SqlExecResponse {
            execiter,
            map_or_table,
            sqlscript,
        } = { *self };

        let mut w = try!(w.start(http::Status::Ok));
        try!(w.write_content_type("text/html; charset=utf-8"));
        // try!(w.write_header("Content-Encoding", "gzip"));

        let mut w = try!(w.start_chunked());
        //let mut w = GzEncoder::new(w, Compression::Fast);
        //let mut w = BufWriter::new(w);
        {
            let mut out = JsonStreamWriter(&mut w);

            let mut current_fields = None;

            for event in execiter {

                // close current rowset on not Row event
                // if let ExecEvent::Row(_) = event {
                // } else if current_fields.is_some() {
                //     try!(out.write("rowset_end"));
                //     current_fields = None;
                // }

                match event {
                    ExecEvent::RowsetBegin(fields) => {
                        // try!(view.render_rowset_begin(&fields));
                        try!(out.write(("rowset", &fields)));
                        current_fields = Some(fields);
                    }

                    ExecEvent::Row(row) => try!(out.write(
                        ("r", row),

                        // &current_fields.as_ref().expect("Row event occured before RowsetBegin event.")[..]
                    )),

                    ExecEvent::QueryPlan(ref plan) => try!(
                        out.write(("query_plan", plan))
                    ),

                    ExecEvent::NonQuery { ref command_tag } => try!(
                        out.write(("non_query", command_tag))
                    ),

                    ExecEvent::Error { ref message, bytepos } => try!(
                        out.write(("error", message,
                            bytepos.map(|pos| LineCol::end_of_str(&sqlscript[..pos]).line)))
                    ),

                    ExecEvent::Notice { ref message, bytepos } => try!(
                        out.write(("notice", message,
                            bytepos.map(|pos| LineCol::end_of_str(&sqlscript[..pos]).line)))
                    ),
                };
            }
        }



        //let mut w = try!(w.into_inner());
        //let mut w = try!(w.finish());

        w.end()
    }
}

fn dispatch_exec_events<TExecIter, TView>(
    mut execiter: TExecIter,
    mut view: TView,
    sqlscript: &str)
    -> io::Result<()>
    where TView: View,
          TExecIter: Iterator<Item=ExecEvent>
{
    try!(view.render_intro());

    let mut current_fields = None;

    for event in execiter {

        // close current rowset on not Row event
        if let ExecEvent::Row(_) = event {
        } else if current_fields.is_some() {
            try!(view.render_rowset_end());
            current_fields = None;
        }

        match event {
            ExecEvent::RowsetBegin(fields) => {
                try!(view.render_rowset_begin(&fields));
                current_fields = Some(fields);
            }

            ExecEvent::Row(row) => try!(view.render_row(
                row.iter().map(|maybe_val| {
                    maybe_val.as_ref().map(|val| &val[..])
                }),

                &current_fields.as_ref().expect("Row event occured before RowsetBegin event.")[..]
            )),

            ExecEvent::QueryPlan(ref plan) => try!(view.render_queryplan(plan)),

            ExecEvent::NonQuery { command_tag: ref cmd } => try!(view.render_nonquery(cmd)),

            ExecEvent::Error { ref message, bytepos } => try!(view.render_error(
                message,
                bytepos.map(|pos| LineCol::end_of_str(&sqlscript[..pos]))
            )),

            ExecEvent::Notice { ref message, bytepos } => try!(view.render_notice(
                message,
                bytepos.map(|pos| LineCol::end_of_str(&sqlscript[..pos]))
            )),
        };
    }





    // let tables_oids = fields_descrs
    //     .iter()
    //     .flat_map(|it| it.iter())
    //     .filter_map(|it| it.table_oid)
    //     .map(|it| it.to_string())
    //     .collect::<Vec<_>>()
    //     .connect(",");
    //
    // let keys_of_all_selected_tables = if tables_oids.is_empty() {
    //     vec![]
    // } else {
    //     dbconn.query::<(pg::Oid, String)>(&format!(
    //         "SELECT indrelid AS table_oid
    //                ,indkey AS columns_ids
    //            FROM pg_index
    //           WHERE indisunique
    //             AND indexprs IS NULL
    //             AND indrelid IN ({tables_oids})
    //        ORDER BY indisprimary DESC",
    //        tables_oids = tables_oids))
    //         .unwrap()
    //         .into_iter()
    //         .map(|(table_oid, key_col_ids_space_separated)| (
    //             table_oid,
    //             key_col_ids_space_separated
    //                     .split(' ')
    //                     .map(|it| it.to_string())
    //                     .collect::<BTreeSet<_>>()
    //         ))
    //         .collect::<Vec<_>>()
    // };
    //
    // #[derive(RustcDecodable)]
    // struct ColumnDescr {
    //     table_oid: pg::Oid,
    //     table_name: String,
    //     schema_name: String,
    //     id: i16,
    //     name: String,
    //     is_notnull: bool,
    //     has_default: bool,
    // }
    //
    // let cols_of_all_selected_tables = if tables_oids.is_empty() {
    //     vec![]
    // } else {
    //     dbconn.query::<ColumnDescr>(&format!(
    //         "SELECT attrelid
    //                ,relname
    //                ,nspname
    //                ,attnum
    //                ,attname
    //                ,attnotnull
    //                ,atthasdef
    //            FROM pg_attribute
    //                 JOIN pg_class ON pg_class.oid = attrelid
    //                 JOIN pg_namespace ON pg_namespace.oid = relnamespace
    //           WHERE attnum > 0
    //             AND NOT attisdropped
    //             AND attrelid IN ({tables_oids})",
    //         tables_oids = tables_oids
    //         )).unwrap()
    // };latest_rowset_id:#?}", keys_of_all_selected_tables);
    //
    // for (rowset_id, fields) in fields_descrs.iter().enumerate() {
    //
    //     let tables_oids = fields.iter()
    //                             .filter_map(|field| field.table_oid)
    //                             .collect::<BTreeSet<_>>();
    //
    //     if tables_oids.len() == 1 {
    //         let selected_table_oid = tables_oids.into_iter().next().unwrap();
    //
    //         let selected_col_ids = fields.iter()
    //                 .filter(|field| field.table_oid == Some(selected_table_oid))
    //                 .filter_map(|field| field.column_id)
    //                 .map(|column_id| column_id.to_string())
    //                 .collect::<BTreeSet<_>>();
    //
    //         let empty_set = BTreeSet::new();
    //         let selected_key = keys_of_all_selected_tables.iter()
    //                 .filter(|&&(table_oid, _)| table_oid == selected_table_oid)
    //                 .map(|&(_, ref key)| key)
    //                 .find(|key| key.is_subset(&selected_col_ids))
    //                 .unwrap_or(&empty_set);
    //
    //         let cols_of_selected_table = cols_of_all_selected_tables.iter()
    //                 .filter(|col| col.table_oid == selected_table_oid)
    //                 .map(|col| view::EditableColumn {
    //                     name: col.name.clone(),
    //                     is_key: selected_key.contains(&col.id.to_string()[..]),
    //                     is_notnull: col.is_notnull,
    //                     has_default: col.has_default,
    //                     field_idx: fields.iter().position(|field| field.column_id == Some(col.id))
    //                 })
    //                 .collect::<Vec<_>>();
    //
    //         let mandatory_col_ids = cols_of_all_selected_tables.iter()
    //                 .filter(|col| col.table_oid == selected_table_oid)
    //                 .filter(|col| col.is_notnull && !col.has_default)
    //                 .map(|col| col.id.to_string())
    //                 .collect::<BTreeSet<_>>();
    //
    //         let rowset_is_updatable_and_deletable = !selected_key.is_empty();
    //         let rowset_is_insertable = mandatory_col_ids.is_subset(&selected_col_ids);
    //
    //         if rowset_is_updatable_and_deletable || rowset_is_insertable {
    //             let (schema_name, table_name) = cols_of_all_selected_tables.iter()
    //                 .filter(|col| col.table_oid == selected_table_oid)
    //                 .map(|col| (col.schema_name.clone(), col.table_name.clone()))
    //                 .next()
    //                 .unwrap();
    //
    //             try!(view.make_rowset_editable(rowset_id as i32, &view::EditableTable {
    //                 db_name: dbname.to_string(),
    //                 schema_name: schema_name,
    //                 table_name: table_name,
    //                 columns: cols_of_selected_table
    //             }));
    //         }
    //
    //
    //
    //     }
    //
    //     // is rowset updatable
    //     // is rowset deletable
    // }

    try!(view.render_outro());

    Ok(())
}

trait View {

    fn render_intro(
        &mut self)
        -> io::Result<()>;

    fn render_outro(
        &mut self)
        -> io::Result<()>;

    fn render_rowset_begin(
        &mut self,
       &[Field])
       -> io::Result<()>;

    fn render_rowset_end(
        &mut self)
        -> io::Result<()>;

    fn render_row<'a, T>(
        &mut self,
        row: T,
        descrs: &[Field])
        -> io::Result<()>
        where T: Iterator<Item=Option<&'a str>>;

    fn render_notice(
        &mut self,
        message: &str,
        linecol: Option<LineCol>)
        -> io::Result<()>;

    fn render_error(
        &mut self,
        message: &str,
        linecol: Option<LineCol>)
        -> io::Result<()>;

    fn render_nonquery(
        &mut self,
        command_tag: &str)
        -> io::Result<()>;

    fn render_queryplan(
        &mut self,
        plan: &QueryPlanNode)
        -> io::Result<()>;

    // fn flush(&self) -> io::Result<()>;
}

struct JsonStreamWriter<W>(W);

impl<W: Write> JsonStreamWriter<W> {
    fn write<T: Encodable>(&mut self, json_obj: T) -> io::Result<()> {
        let inner = &mut self.0;
        let intro = b"<script>parent.pushmsg(";
        let outro = b")</script>";
        try!(inner.write_all(intro));
        try!(write!(inner, "{}", json::as_json(&json_obj)));
        try!(inner.write_all(outro));
        Ok(())
    }

    fn flush(&mut self) -> io::Result<()> {
        self.0.flush()
    }
}
