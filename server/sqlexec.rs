use serde_json;
use serde;
use http;
use std::io::{ self, Write };
use std::collections::{ BTreeMap, BTreeSet, VecDeque };
use postgres as pg;


pub struct SqlExecEndpoint {
    pub pgaddr: String,
}

impl http::Resource for SqlExecEndpoint {
    fn post(&self, req: &http::Request) -> Box<http::Response> {

        #[derive(Deserialize)]
        struct Form {
            user: String,
            password: String,
            describe: bool,
            database: String,
            statements: Vec<String>,
        }

        let content = match req.content.as_ref() {
            Some(x) => x,
            None => return Box::new(JsonResponse {
                status: http::Status::BadRequest,
                content: "Missing content",
            }),
        };

        let utf8_content = match ::std::str::from_utf8(content) {
            Ok(x) => x,
            Err(..) => return Box::new(JsonResponse {
                status: http::Status::BadRequest,
                content: "Invalid UTF8 content",
            }),
        };

        let form = match serde_json::from_str::<Form>(utf8_content) {
            Ok(form) => form,
            Err(err) => return Box::new(JsonResponse {
                status: http::Status::BadRequest,
                content: "Failed to decode form",
            }),
        };

        let maybe_conn = pg::connect(
            &self.pgaddr,
            &form.database,
            (&form.user, &form.password),
        );

        let conn = match maybe_conn {
            Ok(conn) => conn,
            // Err(pg::Error { code: pg::SqlState::InvalidPassword, .. }) |
            // Err(pg::Error { code: pg::SqlState::InvalidAuthorizationSpecification, .. })
            // => return Box::new(JsonResponse {
            //     status: http::Status::BadRequest,
            //     content: "Invalid username or password",
            // }),
            Err(err) => return Box::new(JsonResponse {
                status: http::Status::InternalServerError,
                content: err,
            }),
        };

        Box::new(SqlExecResponse {
            pgconn: conn,
            describe: form.describe,
            statements: form.statements,
        })
    }
}


struct JsonResponse<T: serde::Serialize> {
    status: http::Status,
    content: T,
}

impl<T: serde::Serialize> http::Response for JsonResponse<T> {
    fn write_to(self: Box<Self>, w: http::ResponseStarter) -> io::Result<()> {
        let mut w = try!(w.start(self.status));
        try!(w.write_content_type("application/json"));
        w.write_content(serde_json::to_string(&self.content).unwrap().as_bytes())
    }
}

struct SqlExecResponse {
    pgconn: pg::Connection,
    describe: bool,
    statements: Vec<String>,
}

impl http::Response for SqlExecResponse {
    fn write_to(self: Box<Self>, w: http::ResponseStarter) -> io::Result<()> {
        // use std::iter::Iterator;

        let mut w = try!(w.start(http::Status::Ok));
        try!(w.write_content_type("application/json"));
        let mut chunk_writer = try!(w.start_chunked());


        let SqlExecResponse { mut pgconn, statements, describe, .. } = { *self };

        let mut w = try!(JsonStream::begin(chunk_writer));


        //|/\*let SqlExecResponse { mut conn, statements, describe } = { *self };*/

        for stmt in statements.iter() {

            try!(w.write_message("executing", &serde_json::Value::Null));


            if let Err(ref err) = pgconn.parse_statement("", stmt) {
                try!(w.write_message("error", err));
                break;
            }

            if describe {
                match describe_statement(&mut pgconn) {
                    Ok(ref stmt_descr) => {
                        try!(w.write_message("description", stmt_descr));
                    }

                    Err(ref err) => {
                        try!(w.write_message("error", err));
                        break;
                    }
                };
            }

            if let Err(ref err) = pgconn.execute_statement("", 0, &[]) {
                w.write_message("error", err)?;
                break;
            }

            while let Some(ref row) = pgconn.fetch_row() {
                try!(w.write_raw(row));
            }

            match *pgconn.get_last_execution_result() {
                Some(Ok(ref cmd_tag)) => try!(w.write_message("complete", cmd_tag)),
                Some(Err(ref err)) => try!(w.write_message("error", err)),
                None => try!(w.write_message("complete", &serde_json::Value::Null)),
            }
        }
        pgconn.close();

        let mut chunk_writer = try!(w.end());
        chunk_writer.end()
    }
}

struct JsonStream<W> {
    inner: W,
}

impl<W: Write> JsonStream<W> {
    fn begin(mut w: W) -> io::Result<JsonStream<W>> {
        try!(write!(&mut w, "[\"jsonstream\"\r\n"));
        Ok(JsonStream { inner: w })
    }

    fn write_message<P: serde::Serialize>(
        &mut self,
        messageType: &str,
        payload: &P)
        -> io::Result<()>
    {
        write!(
            &mut self.inner,
            ",{{\"messageType\":\"{}\",\"payload\":{}}}\r\n",
            messageType,
            serde_json::to_string(payload).map_err(|err| io::Error::new(
                io::ErrorKind::InvalidData, err
            ))?
        )
    }

    fn write_raw<P: serde::Serialize>(
        &mut self,
        raw: &P)
        -> io::Result<()>
    {
        self.inner.write(b",")?;
        serde_json::to_writer(&mut self.inner, raw).map_err(|err| {
            io::Error::new(io::ErrorKind::InvalidData, err)
        })?;
        self.inner.write(b"\r\n")?;
        Ok(())
    }

    fn end(mut self) -> io::Result<W> {
        try!(write!(&mut self.inner, "]"));
        Ok(self.inner)
    }
}

/*
#[derive(Debug)]
#[derive(RustcEncodable)]
struct JsonMessage<T> {
    messageType: String,
    payload: T,
}
*/

// #[derive(Debug)]
// #[derive(RustcEncodable)]
// struct StatementDescription {
//     fields: Vec<Field>,
//     foreign_keys: Vec<ForeignKey>,
//     source_table: Option<SourceTable>,
// }

// #[derive(Debug)]
// #[derive(RustcEncodable)]
// struct SourceTable {
//     table_name: String,
//     schema_name: String,
//     database: String,
//     columns: BTreeMap<String, Column>,
//     key: Vec<String>,
// }

// #[derive(Debug)]
// #[derive(RustcEncodable)]
// struct ForeignKey {
//     fields: Vec<u32>,
//     related_table: String,
//     related_columns: Vec<String>,
// }

// #[derive(Debug)]
// #[derive(RustcEncodable)]
// pub struct Field {
//     pub name: String,
//     pub typ: String,
//     pub is_num: bool,
//     pub is_geojson: bool,
//     pub src_column: Option<String>,
// }

// /// Describes column of table
// #[derive(Debug)]
// #[derive(RustcEncodable)]
// pub struct Column {
//     pub is_notnull: bool,
//     pub has_default: bool,
// }


fn describe_statement(conn: &mut pg::Connection) -> pg::Result<serde_json::Value> {


    let fields = conn.describe_statement("")?;

    if fields.is_empty() {
        return Ok(serde_json::Value::Null);
    }

    let (columns_names, source_table_json) = describe_source_table(conn, &fields)?;

    let typ_descrs = pg::query(conn, &format!(
        stringify!(
              SELECT format_type(param.typoid, param.typmod)
                    ,pg_type.typcategory = 'N'
                FROM (VALUES {}) AS param(ord, typoid, typmod)
                JOIN pg_type ON pg_type.oid = param.typoid
            ORDER BY param.ord
        ),
        fields.iter()
                 .enumerate()
                 .map(|(i, f)| format!(
                    "({},{},{})",
                    i, f.typ_oid, f.typ_modifier
                 ))
                 .collect::<Vec<_>>()
                 .join(",")
    ))?.into_iter()
        .map(VecDeque::from)
        .map(|mut row| (
            row.pop_front().unwrap().unwrap(),
            row.pop_front().unwrap().unwrap() == "t",
        )).collect::<Vec<_>>();

    let fields_json = fields.into_iter().zip(typ_descrs)
        .map(|(field, (fmttyp, is_num))| json!({
            "name": field.name,
            "typ": fmttyp,
            "is_geojson": false,
            "is_num": is_num,
            "src_column": field.table_oid
                .and_then(|table_oid| field.column_id.map(|column_id| (table_oid, column_id)))
                .and_then(|it| columns_names.get(&it)),
        }))
        .collect::<Vec<_>>();

    Ok(json!({
        "fields": fields_json,
        "src_table": source_table_json,
    }))
}


fn describe_source_table(
    conn: &mut pg::Connection,
    fields: &[pg::FieldDescription])
    -> pg::Result<(BTreeMap<(pg::Oid, i16), String>, serde_json::Value)>
{
    let tables_oids = fields.iter()
                               .filter_map(|it| it.table_oid)
                               .collect::<BTreeSet<_>>();

    if tables_oids.is_empty() {
        return Ok((BTreeMap::new(), serde_json::Value::Null));
    }

    let tables_oids_csv = tables_oids.iter()
                                     .map(|it| it.to_string())
                                     .collect::<Vec<_>>()
                                     .join(",");

    let res
        = pg::query(conn, &format!(
            stringify!(
                  SELECT indrelid, indkey
                    FROM pg_index
                   WHERE indisunique
                     AND indexprs IS NULL
                     AND indrelid IN ({})
                ORDER BY indisprimary DESC
            ),
            tables_oids_csv
        ))?
        .into_iter()
        .map(VecDeque::from)
        .map(|mut row| (
            row.pop_front().unwrap().unwrap().parse::<pg::Oid>().unwrap(),
            row.pop_front().unwrap().unwrap(),
        ))
        .map(|(table_oid, key_col_ids_space_separated)| (
            table_oid,
            fields.iter()
                     .filter(|it| it.table_oid == Some(table_oid))
                     .filter_map(|it| it.column_id)
                     .collect(),
            key_col_ids_space_separated.split(' ')
                                       .map(|it| it.parse().unwrap_or(-1))
                                       .collect::<BTreeSet<_>>()
        ))
        .find(|&(table_oid, ref selected_col_ids, ref key_col_ids)| {
            key_col_ids.is_subset(selected_col_ids)
        });

    let (table_oid, _, key_columns_ids) = match res {
        Some(it) => it,
        None => return Ok((BTreeMap::new(), serde_json::Value::Null)),
    };

    struct ColumnDescr {
        table_oid: pg::Oid,
        table_fullname: String,
        column_id: i16,
        name: String,
        is_notnull: bool,
        has_default: bool,
    }

    let cols_descrs = pg::query(conn, &format!(
        stringify!(
            SELECT attrelid
                  ,quote_ident(nspname) || '.' || quote_ident(relname)
                  ,attnum
                  ,attname
                  ,attnotnull
                  ,atthasdef
              FROM pg_attribute
              JOIN pg_class ON pg_class.oid = attrelid
              JOIN pg_namespace ON relnamespace = pg_namespace.oid
             WHERE attnum > 0
               AND NOT attisdropped
               AND attrelid = {}
        ),
        table_oid
    ))?.into_iter()
        .map(VecDeque::from)
        .map(|mut row| ColumnDescr {
            table_oid: row.pop_front().unwrap().unwrap().parse().unwrap(),
            table_fullname: row.pop_front().unwrap().unwrap(),
            column_id: row.pop_front().unwrap().unwrap().parse().unwrap(),
            name: row.pop_front().unwrap().unwrap(),
            is_notnull: row.pop_front().unwrap().unwrap() == "t",
            has_default: row.pop_front().unwrap().unwrap() == "t",
        }).collect::<Vec<_>>();

    let colnames = cols_descrs.iter().map(|it| (
        (it.table_oid, it.column_id),
        it.name.clone(),
    )).collect::<BTreeMap<_, _>>();

    let source_table_json = json!({
        "database": conn.database(),
        "table_name": cols_descrs.iter()
                               .map(|it| it.table_fullname.clone())
                               .nth(0),
        "columns": cols_descrs.iter()
                              .filter(|it| it.table_oid == table_oid)
                              .map(|it| (it.name.clone(), json!({
                                  "has_default": it.has_default,
                                  "is_notnull": it.is_notnull,
                              })))
                              .collect::<serde_json::Map<_, _>>(),
        "key_columns": key_columns_ids.into_iter()
                                  .map(|column_id| colnames.get(&(table_oid, column_id)))
                                  .collect::<Vec<_>>(),
    });

    Ok((colnames, source_table_json))
}
