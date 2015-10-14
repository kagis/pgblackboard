mod splitting;
mod explain;

use self::splitting::split_statements;
use self::splitting::trimstart_comments;
use self::splitting::extract_connect_metacmd;
use self::explain::queryplan_from_jsonstr;
use super::connection::{ self, connect, Connection, Cursor };
use dbms::{ ExecEvent, Field, Column };
use std::ops::Range;
use std::collections::VecDeque;



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
                    let fields = pg_fields_descrs.into_iter().map(|it| Field {
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

impl PgExecIter {
    fn next_stmt(&mut self) -> Option<String> {
        self.message_bytepos_offset += self.current_stmt.len();
        let maybe_next_stmt = self.stmts.pop_front();
        self.current_stmt = maybe_next_stmt.clone().unwrap_or("".to_string());
        maybe_next_stmt
    }

    fn make_err_event(&self, err: &connection::Error) -> ExecEvent {
        let mut bytepos = Some(
            &self.current_stmt.len() -
            trimstart_comments(&self.current_stmt).len()
        );

        if let connection::Error::SqlError(
            connection::SqlError { position: Some(charpos), .. }
        ) = *err {
            if let Some((stmt_bytepos, _)) = self.current_stmt.char_indices().nth(charpos) {
                bytepos = Some(stmt_bytepos);
            }
        }

        ExecEvent::Error {
            message: format!("{:#?}", err),
            bytepos:  bytepos.map(|it| it + self.message_bytepos_offset),
        }
    }
}
