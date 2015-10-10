mod splitting;
mod metacmd;

use self::splitting::split_statements;
use self::metacmd::extract_connect_metacmd;
use super::connection::{ connect, Connection };
use dbms::ExecEvent;
use std::ops::Range;


pub struct PgExecIter {
    conn: Option<Connection>,
    err: Option<String>,
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
            err: None
        }
    }

    fn new_err(message: &str) -> PgExecIter {
        PgExecIter {
            conn: None,
            err: Some(message.to_string()),
        }
    }
}

impl Iterator for PgExecIter {
    type Item = ExecEvent;

    fn next(&mut self) -> Option<Self::Item> {
        if let Some(err_message) = self.err.take() {
            return Some(ExecEvent::Error {
                message: err_message,
                char_pos: None,
            });
        }

        None
    }
}
