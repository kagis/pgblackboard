mod splitting;
mod explain;

use self::splitting::split_statements;
use self::splitting::trimstart_comments;
use self::splitting::extract_connect_metacmd;
use self::explain::queryplan_from_jsonstr;
use super::connection::{ self, connect, Connection, Cursor, Oid };
use super::ConnectionExt;
use dbms::{ self, ExecEvent, Field, Column };
use std::ops::Range;
use std::collections::VecDeque;
use std::ascii::AsciiExt;



pub struct PgExecIter {
    conn: Option<Connection>,
    next_events: VecDeque<ExecEvent>,
    cursor: Option<Cursor>,
    stmts: VecDeque<String>,
    maybe_explain_json: Option<Option<String>>,
    current_stmt: String,
    message_bytepos_offset: usize,
}

impl PgExecIter {
    pub fn new(
        pgaddr: &str,
        credentials: dbms::Credentials,
        script: &str,
        selection: Option<Range<usize>>)
        -> PgExecIter
    {
        let database_and_script = match extract_connect_metacmd(script) {
            Some(it) => it,
            None => return PgExecIter::new_err(
                "\\connect database expected on first line."
            )
        };

        let conn_result = connect(
            pgaddr,
            &database_and_script.database[..],
            credentials,
        );

        let mut conn = match conn_result {
            Ok(conn) => conn,
            Err(err) => return PgExecIter::with_event(match err {
                connection::Error::SqlError(connection::PgErrorOrNotice { code: connection::SqlState::InvalidCatalogName, message, .. }) => ExecEvent::Error {
                    message: message,
                    bytepos: Some(database_and_script.database_pos),
                },
                other_err => ExecEvent::Error {
                    message: format!("{:#?}", other_err),
                    bytepos: None,
                },
            }),
        };

        let (message_bytepos_offset, sqlscript_to_execute) = match selection {
            Some(selection) => (
                selection.start,
                &script[selection],
            ),
            None => (
                database_and_script.sqlscript_pos,
                database_and_script.sqlscript,
            ),
        };

        PgExecIter {
            conn: Some(conn),
            cursor: None,
            maybe_explain_json: None,
            message_bytepos_offset: message_bytepos_offset,
            current_stmt: "".to_string(),
            next_events: VecDeque::new(),
            stmts: split_statements(sqlscript_to_execute)
                        .map(|it| it.to_string())
                        .collect(),
        }
    }

    fn new_err(message: &str) -> PgExecIter {
        let mut next_events = VecDeque::new();
        next_events.push_back(ExecEvent::Error {
            message: message.to_string(),
            bytepos: None,
        });

        PgExecIter {
            next_events: next_events,
            conn: None,
            cursor: None,
            maybe_explain_json: None,
            message_bytepos_offset: 0,
            current_stmt: "".to_string(),
            stmts: VecDeque::new(),
        }
    }

    fn with_event(event: ExecEvent) -> PgExecIter {
        let mut next_events = VecDeque::new();
        next_events.push_back(event);

        PgExecIter {
            next_events: next_events,
            conn: None,
            cursor: None,
            maybe_explain_json: None,
            message_bytepos_offset: 0,
            current_stmt: "".to_string(),
            stmts: VecDeque::new(),
        }
    }
}

impl Iterator for PgExecIter {
    type Item = ExecEvent;

    fn next(&mut self) -> Option<Self::Item> {
        if let Some(event) = self.next_events.pop_front() {
            return Some(event);
        }

        if let Some(mut cursor) = self.cursor.take() {
            if let Some(row) = cursor.next() {

                if self.maybe_explain_json.is_none() {
                    if let Some(maybe_val) = row.first() {
                        self.maybe_explain_json = Some(
                            maybe_val.as_ref().map(|it| it.to_string())
                        );
                    }
                }

                self.cursor = Some(cursor);
                return Some(ExecEvent::Row(row));
            } else {
                let maybe_explain_json = self.maybe_explain_json.take();


                match cursor.complete() {
                    Ok((cmdtag, conn)) => {
                        self.conn = Some(conn);

                        if let ("EXPLAIN", Some(Some(ref explain_json))) = (&cmdtag[..], maybe_explain_json) {
                            if let Some(plan) = queryplan_from_jsonstr(explain_json) {
                                return Some(ExecEvent::QueryPlan(plan));
                            }
                        }
                    }
                    Err(ref err) => return Some(self.make_err_event(err))
                }
            }
        }

        if let Some(conn) = self.conn.as_mut() {
            if let Some(notice) = conn.pop_notice() {
                return Some(ExecEvent::Notice {
                    message: notice.message,
                    bytepos: None,
                });
            }
        }

        if let Some(mut conn) = self.conn.take() {

            if let Some(stmt) = self.next_stmt() {

                let prepare_result = conn.parse_statement("", &stmt[..])
                       .and_then(|_| conn.describe_statement(""));

                let pg_fields_descrs = match prepare_result {
                    Ok(it) => it,
                    Err(ref err) => return Some(self.make_err_event(err))
                };

                if pg_fields_descrs.is_empty() {
                    return match conn.execute_statement("", &[]).complete() {
                        Ok((cmdtag, conn)) => {
                            self.conn = Some(conn);
                            Some(ExecEvent::NonQuery {
                                command_tag: cmdtag
                            })
                        }
                        Err(ref err) => Some(self.make_err_event(err))
                    }
                } else {
                    return match map_pgfields_to_dbmsfields(&mut conn, pg_fields_descrs) {
                        Ok(fields) => {
                            self.cursor = Some(conn.execute_statement("", &[]));
                            Some(ExecEvent::RowsetBegin(fields))
                        }
                        Err(ref err) => Some(self.make_err_event(err))
                    };
                }
            } else {
                conn.close().unwrap();
            }
        }

        None
    }
}

impl PgExecIter {
    fn next_stmt(&mut self) -> Option<String> {
        self.message_bytepos_offset += self.current_stmt.len();
        let maybe_next_stmt = self.stmts.pop_front();
        self.current_stmt = maybe_next_stmt.clone().unwrap_or("".to_string());
        maybe_next_stmt
    }

    fn make_err_event(&self, err: &connection::Error) -> ExecEvent {
        match *err {
            connection::Error::SqlError(ref sql_err) => ExecEvent::Error {
                message: format!("{}: {}", sql_err.severity, sql_err.message),
                bytepos: Some(
                    sql_err.position
                        .and_then(|charpos| self.current_stmt.char_indices()
                                                             .nth(charpos)
                                                             .map(|(bpos, _ch)| bpos))
                        .unwrap_or(self.current_stmt.len()
                                   - trimstart_comments(&self.current_stmt).len())
                        + self.message_bytepos_offset
                ),
            },

            ref other => ExecEvent::Error {
                message: format!("{:#?}", other),
                bytepos: None,
            },
        }
    }
}

fn map_pgfields_to_dbmsfields(
    conn: &mut Connection,
    pg_fields: Vec<connection::FieldDescription>)
    -> Result<Vec<Field>, connection::Error>
{
    use std::collections::BTreeSet;

    let mut src_columns = vec![];
    src_columns.extend((0..pg_fields.len()).map(|_| None));

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

        #[derive(RustcDecodable)]
        struct ColumnDescr {
            id: i16,
            name: String,
            is_notnull: bool,
            has_default: bool,
        }

        let (_cmdtag, cols_descrs) = try!(conn.query::<ColumnDescr>(
            "SELECT attnum
                   ,attname
                   ,attnotnull
                   ,atthasdef
               FROM pg_attribute
              WHERE attnum > 0
                AND NOT attisdropped
                AND attrelid = $1",
            &[Some(&format!("{}", table_oid)[..])]
        ));

        let (_cmdtag, keys) = try!(conn.query::<(String,)>(
            "SELECT indkey
               FROM pg_index
              WHERE indisunique
                AND indexprs IS NULL
                AND indrelid = $1
           ORDER BY indisprimary DESC",
           &[Some(&format!("{}", table_oid)[..])]));

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
            src_columns = pg_fields
                .iter()
                .map(|pg_field| cols_descrs.iter().find(|col_descr| Some(col_descr.id) == pg_field.column_id))
                .map(|maybe_col_descr| maybe_col_descr.map(|col_descr| Column {
                    table_path: vec![conn.database().to_owned(), table_oid.to_string()],
                    name: col_descr.name.clone(),
                    is_key: selected_key.contains(&col_descr.id.to_string()[..]),
                    is_notnull: col_descr.is_notnull,
                    has_default: col_descr.has_default,
                }))
                .collect::<Vec<_>>();
        }
    }

    let typ_descrs = try!(describe_types(
        conn,
        &pg_fields
    ));

    Ok(pg_fields
        .into_iter()
        .zip(typ_descrs.into_iter())
        .zip(src_columns.into_iter())
        .map(|((field_descr, typ_descr), src_col)| Field {
            is_geojson: field_descr.name.eq_ignore_ascii_case("st_asgeojson"),
            name: field_descr.name,
            typ: typ_descr.0,
            is_num: typ_descr.1,
            src_column: src_col,
        })
        .collect())
}
//
// fn describe_table(
//     conn:,
//     table_oid: Oid)
//     -> Result<Vec<(String, bool)>, connection::Error>
// {
//
//
//
// }


fn describe_types(
    conn: &mut Connection,
    pg_fields: &[connection::FieldDescription])
    -> Result<Vec<(String, bool)>, connection::Error>
{
    conn.query("
        select format_type($1[i][1], $1[i][2]), typcategory = 'N'
        from generate_series(1, array_length($1::int[][], 1)) as i
            join pg_type on pg_type.oid = $1[i][1]
    ", &[Some(&format!(
        "{{{0}}}",
        (&pg_fields
            .iter()
            .map(|it| format!("{{{0},{1}}}", it.typ_oid, it.typ_modifier))
            .collect::<Vec<_>>()[..])
            .join(",")
    )[..])]).map(|(_cmdtag, typ_descrs)| typ_descrs)
}
