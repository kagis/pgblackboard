use rustc_serialize::{ Encodable, json };
use http;
use std::io::{ self, Write };
use postgres as pg;


pub struct SqlExecEndpoint {
    pub pgaddr: String,
}

impl http::Resource for SqlExecEndpoint {
    fn post(&self, req: &http::Request) -> Box<http::Response> {

        #[derive(RustcDecodable)]
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

        let form = match json::decode::<Form>(utf8_content) {
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
            Err(pg::PgErrorOrNotice { code: pg::SqlState::InvalidPassword, .. }) => return Box::new(JsonResponse {
                status: http::Status::BadRequest,
                content: "Invalid username or password",
            }),
            Err(err) => return Box::new(JsonResponse {
                status: http::Status::InternalServerError,
                content: "Failed to connect PostgreSQL server",
            }),
        };

        Box::new(SqlExecResponse {
            pgconn: conn,
            describe: form.describe,
            statements: form.statements,
        })
    }
}


struct JsonResponse<T: Encodable> {
    status: http::Status,
    content: T,
}

impl<T: Encodable> http::Response for JsonResponse<T> {
    fn write_to(self: Box<Self>, w: http::ResponseStarter) -> io::Result<()> {
        let mut w = try!(w.start(self.status));
        try!(w.write_content_type("application/json"));
        if self.status == http::Status::Unauthorized {
            try!(w.write_www_authenticate_basic("postgres"));
        }
        w.write_content(json::encode(&self.content).unwrap().as_bytes())
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

            try!(w.write_message("executing", &json::Json::Null));


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
                None => try!(w.write_message("complete", &json::Json::Null)),
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

    fn write_message<P: Encodable>(
        &mut self,
        messageType: &str,
        payload: &P)
        -> io::Result<()>
    {
        write!(
            &mut self.inner,
            ",{{\"messageType\":\"{}\",\"payload\":{}}}\r\n",
            messageType,
            json::as_json(payload)
        )
    }

    fn write_raw<P: Encodable>(
        &mut self,
        raw: &P)
        -> io::Result<()>
    {
        write!(
            &mut self.inner,
            ",{}\r\n",
            json::as_json(raw),
        )
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

#[derive(Debug)]
#[derive(RustcEncodable)]
struct StatementDescription {
    fields: Vec<Field>,
    foreign_keys: Vec<ForeignKey>,
    source_table: Option<Source_table>,
}

#[derive(Debug)]
#[derive(RustcEncodable)]
struct Source_table {
    table_name: String,
    schema_name: String,
    dbName: String,
    columns: Vec<Column>,
}

#[derive(Debug)]
#[derive(RustcEncodable)]
struct ForeignKey {
    fields: Vec<u32>,
    related_table: String,
    related_columns: Vec<String>,
}

#[derive(Debug)]
#[derive(RustcEncodable)]
pub struct Field {
    pub name: String,
    pub typ: String,
    pub is_num: bool,
    pub is_geojson: bool,
}

/// Describes column of table
#[derive(Debug)]
#[derive(RustcEncodable)]
pub struct Column {
    pub name: String,
    pub is_key: bool,
    pub is_notnull: bool,
    pub has_default: bool,
    pub field_index: Option<usize>,
}


fn describe_statement(conn: &mut pg::Connection) -> pg::Result<StatementDescription> {
    use std::collections::BTreeSet;

    let pg_fields = try!(conn.describe_statement(""));



    let mut source_table = None;

    let queried_tables_oids = pg_fields
        .iter()
        .filter_map(|it| it.table_oid)
        .collect::<BTreeSet<_>>()
        .into_iter()
        .collect::<Vec<_>>();

    // single table selected
    // if let [table_oid] = &queried_tables_oids[..] {
    if queried_tables_oids.len() == 1 {
        let table_oid = queried_tables_oids[0];

        let (_cmdtag, mut res) = try!(pg::query::<(String, String)>(conn, &format!(
            "select relname, nspname
            from pg_class join pg_namespace on relnamespace = pg_namespace.oid
            where pg_class.oid = {}",
                table_oid
        )));

        let (table_name, schema_name) = res.pop()
            .expect("failed to resolve source table name");

        #[derive(RustcDecodable)]
        struct ColumnDescr {
            id: i16,
            name: String,
            is_notnull: bool,
            has_default: bool,
        }

        let (_cmdtag, cols_descrs) = try!(pg::query::<ColumnDescr>(conn, &format!(
            "SELECT attnum
                   ,attname
                   ,attnotnull
                   ,atthasdef
               FROM pg_attribute
              WHERE attnum > 0
                AND NOT attisdropped
                AND attrelid = {}",
                table_oid
        )));

        let (_cmdtag, keys) = try!(pg::query::<(String,)>(conn, &format!(
            "SELECT indkey
               FROM pg_index
              WHERE indisunique
                AND indexprs IS NULL
                AND indrelid = {}
           ORDER BY indisprimary DESC",
           table_oid
        )));

        let keys = keys
            .into_iter()
            .map(|(key_col_ids_space_separated,)| {
                key_col_ids_space_separated
                        .split(' ')
                        .map(|it| it.to_string())
                        .collect::<BTreeSet<_>>()
            })
            .collect::<Vec<_>>();

        let selected_cols_ids = pg_fields
            .iter()
            .filter(|field| field.table_oid == Some(table_oid))
            .filter_map(|field| field.column_id)
            .map(|column_id| column_id.to_string())
            .collect::<BTreeSet<_>>();

        let empty_set = BTreeSet::new();
        let selected_key = keys
            .iter()
            .find(|key| key.is_subset(&selected_cols_ids))
            .unwrap_or(&empty_set);

        let mandatory_cols_ids = cols_descrs
            .iter()
            .filter(|col| col.is_notnull && !col.has_default)
            .map(|col| col.id.to_string())
            .collect::<BTreeSet<_>>();

        let rowset_is_updatable_and_deletable = !selected_key.is_empty();
        let rowset_is_insertable = mandatory_cols_ids.is_subset(&selected_cols_ids);

        if rowset_is_updatable_and_deletable || rowset_is_insertable {
            source_table = Some(Source_table {
                dbName: conn.database().to_owned(),
                schema_name: schema_name,
                table_name: table_name,
                columns: cols_descrs
                    .iter()
                    .map(|col_descr| Column {
                        name: col_descr.name.clone(),
                        is_key: selected_key.contains(&col_descr.id.to_string()),
                        is_notnull: col_descr.is_notnull,
                        has_default: col_descr.has_default,
                        field_index: pg_fields.iter().position(|pg_field| Some(col_descr.id) == pg_field.column_id)
                    })
                    .collect()
            });
        }
    }

    let typ_descrs = if pg_fields.is_empty() {
        vec![]
    } else {
        let (_, typ_descrs) = try!(pg::query::<(String, bool)>(conn, &format!(
            "SELECT format_type(param.typoid, param.typmod), pg_type.typcategory = 'N' \
            FROM (VALUES {}) AS param(ord, typoid, typmod) \
            JOIN pg_type ON pg_type.oid = param.typoid \
            ORDER BY param.ord",
            pg_fields.iter()
            .enumerate()
            .map(|(i, f)| format!("({},{},{})", i, f.typ_oid, f.typ_modifier))
            .collect::<Vec<_>>()
            .join(",")
        )));
        typ_descrs
    };



    Ok(StatementDescription {
        foreign_keys: vec![],
        source_table: source_table,
        fields: pg_fields
            .into_iter()
            .zip(typ_descrs)
            .map(|(pg_field, (fmttyp, is_num))| Field {
                name: pg_field.name,
                typ: fmttyp,
                is_geojson: false,
                is_num: is_num,
            })
            .collect(),
    })
}
