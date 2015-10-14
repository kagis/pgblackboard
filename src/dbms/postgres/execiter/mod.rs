mod splitting;
mod metacmd;
mod explain;

use self::splitting::split_statements;
use self::metacmd::extract_connect_metacmd;
use self::explain::queryplan_from_jsonstr;
use super::connection::{ connect, Connection, Cursor };
use dbms::{ ExecEvent, Field, Column };
use std::ops::Range;
use std::collections::VecDeque;



pub struct PgExecIter {
    conn: Option<Connection>,
    err: Option<String>,
    cursor: Option<Cursor>,
    stmts: VecDeque<String>,
    maybe_explain_json: Option<Option<String>>
}

impl PgExecIter {
    pub fn new(
        pgaddr: &str,
        user: &str,
        password: &str,
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
            user,
            password
        );

        let conn = match conn_result {
            Ok(conn) => conn,
            Err(err) => return PgExecIter::new_err(
                &format!("{:#?}", err)[..]
            )
        };

        PgExecIter {
            conn: Some(conn),
            err: None,
            cursor: None,
            maybe_explain_json: None,
            stmts: split_statements(database_and_script.sqlscript)
                        .map(|it| it.to_string())
                        .collect(),
        }
    }

    fn new_err(message: &str) -> PgExecIter {
        PgExecIter {
            err: Some(message.to_string()),
            conn: None,
            cursor: None,
            maybe_explain_json: None,
            stmts: VecDeque::new(),
        }
    }
}

impl Iterator for PgExecIter {
    type Item = ExecEvent;

    fn next(&mut self) -> Option<Self::Item> {
        if let Some(err_message) = self.err.take() {
            return Some(ExecEvent::Error {
                message: err_message,
                bytepos: None,
            });
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

                        if cmdtag == "EXPLAIN" {
                            if let Some(explain_json) = maybe_explain_json {
                                if let Some(ref explain_json) = explain_json {
                                    if let Some(plan) = queryplan_from_jsonstr(explain_json) {
                                        return Some(ExecEvent::QueryPlan(plan));
                                    }
                                }
                            }
                        }
                    }
                    Err(err) => {
                        return Some(ExecEvent::Error {
                            message: format!("{:#?}", err),
                            bytepos: None,
                        });
                    }
                }
            }
        }

        if let Some(mut conn) = self.conn.take() {
            if let Some(stmt) = self.stmts.pop_front() {
                conn.parse_statement("", &stmt[..]).unwrap();
                let fields = conn.describe_statement("").unwrap();
                if fields.is_empty() {
                    return match conn.execute_statement("", &[]).complete() {
                        Ok((cmdtag, conn)) => {
                            self.conn = Some(conn);
                            Some(ExecEvent::NonQuery {
                                command_tag: cmdtag
                            })
                        }
                        Err(err) => {
                            Some(ExecEvent::Error {
                                message: format!("{:#?}", err),
                                bytepos: None,
                            })
                        }
                    }
                } else {
                    let fields = fields.into_iter().map(|it| Field {
                        name: it.name,
                        is_num: false,
                        typ: "type".to_string(),
                        src_column: None,
                    }).collect();
                    self.cursor = Some(conn.execute_statement("", &[]));
                    return Some(ExecEvent::RowsetBegin(fields));
                }
            } else {
                conn.close().unwrap();
            }
        }

        None
    }
}
