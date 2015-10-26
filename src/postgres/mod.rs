mod connection;
mod decoder;
mod objchildren;
mod objdef;
mod execiter;
mod sql;

#[cfg(test)]
mod tests;

use self::connection::{connect, Connection, SqlState, SqlStateClass, Oid};
use self::objchildren::children_query;
use self::objdef::definition_query;
use self::execiter::PgExecIter;
use self::sql::{quote_ident, quote_literal};
use dbms;
use std::ops::Range;
use rustc_serialize::Decodable;

pub struct PgDbms {
    pub addr: String,
}

impl dbms::Dbms for PgDbms {
    type ExecIter = PgExecIter;

    fn execute_script(
        &self,
        credentials: dbms::Credentials,
        script: &str,
        selection: Option<Range<usize>>)
        -> Self::ExecIter
    {
        PgExecIter::new(
            &self.addr[..],
            credentials,
            script,
            selection,
        )
    }

    fn insert_row(
        &self,
        credentials: dbms::Credentials,
        table_path: &[&str],
        row: &dbms::DictRow)
        -> dbms::Result<dbms::DictRow>
    {
        let (database, table_oid) = try!(unpack_table_path(table_path));

        let mut conn = try!(connect(
            &self.addr[..],
            database,
            credentials,
        ));

        let full_table_name = try!(resolve_table_oid(&mut conn, table_oid));

        Ok({
            let mut result = dbms::DictRow::new();
            result.insert("full_table_name".to_string(), Some(full_table_name));
            result
        })
    }

    fn update_row(
        &self,
        credentials: dbms::Credentials,
        table_path: &[&str],
        key: &dbms::DictRow,
        changes: &dbms::DictRow)
        -> dbms::Result<dbms::DictRow>
    {
        let (database, table_oid) = try!(unpack_table_path(table_path));

        if key.is_empty() {
            return Err(empty_key());
        }

        let mut conn = try!(connect(
            &self.addr[..],
            database,
            credentials,
        ));

        let full_table_name = try!(resolve_table_oid(&mut conn, table_oid));

        let (stmt, column_names_by_values_positions) = {
            use std::fmt::Write;
            use std::collections::BTreeMap;

            let mut stmt = String::new();
            stmt.push_str("UPDATE ");
            stmt.push_str(&full_table_name);
            stmt.push_str(" SET ");

            let mut column_names_by_values_positions = BTreeMap::new();
            for (i, (column_name, value_to_set)) in changes.iter().enumerate() {
                if i > 0 {
                    stmt.push(',');
                }
                stmt.push_str(&quote_ident(column_name).to_string());
                stmt.push('=');
                let value_literal_pos = stmt.len() + 1;
                column_names_by_values_positions.insert(value_literal_pos, column_name.clone());
                match *value_to_set {
                    Some(ref val) => stmt.push_str(&quote_literal(val).to_string()),
                    None => stmt.push_str("NULL")
                }
            }

            stmt.push_str(" WHERE ");
            for (i, (column_name, key_value)) in key.iter().enumerate() {
                if i > 0 {
                    stmt.push_str(" AND ");
                }
                stmt.push_str(&quote_ident(column_name).to_string());
                match *key_value {
                    Some(ref val) => {
                        stmt.push('=');
                        stmt.push_str(&quote_literal(val).to_string());
                    }
                    None => {
                        stmt.push_str(" IS NULL");
                    }
                }
            }
            stmt.push_str(" RETURNING *");
            (stmt, column_names_by_values_positions)
        };

        try!(conn.query::<()>("BEGIN", &[]));

        println!("{}", stmt);

        let modify_result = conn.parse_statement("", &stmt)
            .and_then(|_| conn.describe_statement(""))
            .and_then(|descr| conn.execute_statement_into_vec("", 2, &[])
                                  .map(|it| (descr, it)));

        let (descr, (rows, _cmdtag)) = try!(modify_result.map_err(|err| match err {
            connection::Error::SqlError(sql_err) => invalid_input(
                &sql_err.message,
                sql_err.position
                    .and_then(|pos| column_names_by_values_positions.get(&pos))
                    .map(|it| it.clone()),
            ),
            other => dbms::Error::new(
                dbms::ErrorKind::InternalError,
                &format!("{:#?}", other),
            ),
        }));

        let mut rows = rows.into_iter();
        let returned_row = try!(rows.next().ok_or(unexisting_row()));
        try!(rows.next().map(|_| Err(ambiguous_key())).unwrap_or(Ok(())));

        try!(conn.query::<()>("COMMIT", &[]).map_err(|err| match err {
            connection::Error::SqlError(sql_err) => invalid_input(&sql_err.message, None),
            connection::Error::IoError(io_err) => internal_error(&io_err),
            other => internal_error(&other),
        }));

        let dict = descr.iter()
                        .map(|field_descr| field_descr.name.clone())
                        .zip(returned_row)
                        .collect::<dbms::DictRow>();

        Ok(dict)

    }

    fn delete_row(
        &self,
        credentials: dbms::Credentials,
        table_path: &[&str],
        key: &dbms::DictRow)
        -> dbms::Result<dbms::DictRow>
    {
        let (database, table_oid) = try!(unpack_table_path(table_path));

        if key.is_empty() {
            return Err(empty_key());
        }

        let mut conn = try!(connect(
            &self.addr[..],
            database,
            credentials,
        ));

        let full_table_name = try!(resolve_table_oid(&mut conn, table_oid));

        fn col_eq_val((col, maybe_val): (&String, &Option<String>)) -> String {
            let quoted_col = quote_ident(col);
            match maybe_val.as_ref() {
                Some(val) => format!("{}={}", quoted_col, quote_literal(val)),
                None => format!("{} IS NULL", quoted_col)
            }
        }

        let stmt = format!(
            "DELETE FROM {} WHERE {} RETURNING *",
            full_table_name,
            key.iter()
                .map(col_eq_val)
                .collect::<Vec<_>>()
                .join(" AND ")
        );

        try!(conn.query::<()>("BEGIN", &[]));

        println!("{}", stmt);

        let modify_result = conn.parse_statement("", &stmt)
            .and_then(|_| conn.describe_statement(""))
            .and_then(|descr| conn.execute_statement_into_vec("", 2, &[])
                                  .map(|it| (descr, it)));

        let (descr, (rows, _cmdtag)) = try!(modify_result.map_err(|err| match err {
            connection::Error::SqlError(sql_err) => invalid_input(&sql_err.message, None),
            other => internal_error(&other),
        }));

        let mut rows = rows.into_iter();
        let returned_row = try!(rows.next().ok_or(unexisting_row()));
        try!(rows.next().map(|_| Err(ambiguous_key())).unwrap_or(Ok(())));

        try!(conn.query::<()>("COMMIT", &[]).map_err(|err| match err {
            connection::Error::SqlError(sql_err) => invalid_input(&sql_err.message, None),
            connection::Error::IoError(io_err) => internal_error(&io_err),
            other => internal_error(&other),
        }));

        let dict = descr.iter()
                        .map(|field_descr| field_descr.name.clone())
                        .zip(returned_row)
                        .collect::<dbms::DictRow>();

        Ok(dict)
    }

    fn get_root_dbobjs(
        &self,
        credentials: dbms::Credentials)
        -> dbms::Result<Vec<dbms::DbObj>>
    {
        let conn = try!(connect(
            &self.addr[..],
            "postgres",
            credentials,
        ));

        #[derive(RustcDecodable)]
        struct DbObj_ {
            database: String,
            id: String,
            typ: String,
            name: String,
            comment: Option<String>,
            can_have_children: bool,
        }

        query_dbobj::<DbObj_>(
            conn,
            include_str!("objchildren/databases.sql"),
            &[]
        ).map(|dbobjs| dbobjs.into_iter().map(|it| dbms::DbObj {
            path: vec![it.database, it.typ, it.id],
            name: it.name,
            comment: it.comment,
            can_have_children: it.can_have_children,
        }).collect())
    }

    fn get_child_dbobjs(
        &self,
        credentials: dbms::Credentials,
        parent_obj_path: &[&str])
        -> dbms::Result<Vec<dbms::DbObj>>
    {
        #[derive(RustcDecodable)]
        struct DbObj_ {
            database: String,
            id: String,
            typ: String,
            name: String,
            comment: Option<String>,
            can_have_children: bool,
        }

        let (database, parent_dbobj_typ, parent_dbobj_id) = try!(unpack_obj_path(parent_obj_path));

        let conn = try!(connect(
            &self.addr[..],
            database,
            credentials,
        ));

        let query = try!(children_query(parent_dbobj_typ)
                            .ok_or(unexisting_path("Unknown object type")));

        query_dbobj::<DbObj_>(conn, &query, &[
            Some(parent_dbobj_id),
            Some(parent_dbobj_typ),
        ]).map(|dbobjs| dbobjs.into_iter().map(|it| dbms::DbObj {
            path: vec![it.database, it.typ, it.id],
            name: it.name,
            comment: it.comment,
            can_have_children: it.can_have_children,
        }).collect())

    }

    fn get_dbobj_script(
        &self,
        credentials: dbms::Credentials,
        obj_path: &[&str])
        -> dbms::Result<String>
    {
        let (database, dbobj_typ, dbobj_id) = try!(unpack_obj_path(obj_path));

        let conn = try!(connect(
            &self.addr[..],
            database,
            credentials,
        ));

        let query = try!(definition_query(dbobj_typ)
                            .ok_or(unexisting_path("Unknown object type")));

        let mut defs = try!(query_dbobj::<(String,)>(conn, &query, &[Some(dbobj_id)]));
        let (def,) = try!(defs.pop().ok_or(unexisting_path("Object not found")));

        Ok(def)
    }
}

fn resolve_table_oid(
    conn: &mut Connection,
    table_oid: Oid)
    -> dbms::Result<String>
{
    let stmt = "SELECT quote_ident(pg_namespace.nspname) \
                    || '.' \
                    || quote_ident(pg_class.relname) \
                  FROM pg_class JOIN pg_namespace ON pg_namespace.oid = relnamespace \
                 WHERE pg_class.oid = $1;";

    let (_cmdtag, mut rows) = try!(conn.query::<(String,)>(
        stmt,
        &[Some(&format!("{}", table_oid)[..])]
    ));

    rows.pop()
        .map(|(full_table_name,)| full_table_name)
        .ok_or(unexisting_path("Table not found."))
}

fn unpack_table_path<'a>(table_path: &'a [&'a str]) -> Result<(&'a str, Oid), dbms::Error> {
    if let [database, table_oid_str] = table_path {
        table_oid_str.parse()
                     .map(|table_oid| (database, table_oid))
                     .map_err(|_| unexisting_path("Malformed table oid."))
    } else {
        Err(unexisting_path("2 segments expected: database/table_oid."))
    }
}

fn unpack_obj_path<'a>(table_path: &'a [&'a str]) -> Result<(&'a str, &'a str, &'a str), dbms::Error> {
    if let [database, objtyp, objid] = table_path {
        Ok((database, objtyp, objid))
    } else {
        Err(unexisting_path("3 segments expected: database/object_type/object_id."))
    }
}

fn query_dbobj<TRecord: Decodable>(
    mut conn: Connection,
    stmt_body: &str,
    params: &[Option<&str>])
    -> dbms::Result<Vec<TRecord>>
{
    let (_cmdtag, records) = try!(conn.query(stmt_body, params));
    try!(conn.close());
    Ok(records)
}

impl ::std::convert::From<connection::Error> for dbms::Error {
    fn from(err: connection::Error) -> dbms::Error {
        match err {

            connection::Error::SqlError(sql_err) => match sql_err.code.class() {
                SqlStateClass::InvalidCatalogName => unexisting_path("Database not found."),
                SqlStateClass::InvalidAuthorizationSpecification => dbms::Error::new(
                    dbms::ErrorKind::InvalidCredentials,
                    &sql_err.message,
                ),
                _ => internal_error(&sql_err),
            },
            connection::Error::IoError(io_err) => internal_error(&io_err),
            connection::Error::OtherError(err) => internal_error(&err),
        }
    }
}

trait ConnectionExt {
    fn query<TRecord: Decodable>(
        &mut self,
        stmt_body: &str,
        params: &[Option<&str>])
        -> Result<(String, Vec<TRecord>), connection::Error>;
}

impl ConnectionExt for connection::Connection {
    fn query<TRecord: Decodable>(
        &mut self,
        stmt_body: &str,
        params: &[Option<&str>])
        -> Result<(String, Vec<TRecord>), connection::Error>
    {
        let stmt_name = "pgblackboard_stmt";
        try!(self.parse_statement(stmt_name, stmt_body));
        let (rows, cmdtag) = try!(self.execute_statement_into_vec(stmt_name, 0, params));
        try!(self.close_statement(stmt_name));
        let mut records = vec![];
        for row in rows.into_iter() {
            records.push(try!(decoder::decode_row(row).map_err(|err| {
                connection::Error::OtherError(Box::new(err))
            })));
        }
        Ok((cmdtag, records))
    }
}

fn unexisting_row() -> dbms::Error {
    dbms::Error::new(
        dbms::ErrorKind::UnexistingRow,
        "Row was not found.",
    )
}

fn empty_key() -> dbms::Error {
    dbms::Error::new(
        dbms::ErrorKind::AmbiguousKey,
        "Key is empty.",
    )
}

fn ambiguous_key() -> dbms::Error {
    dbms::Error::new(
        dbms::ErrorKind::AmbiguousKey,
        "Key is not unique.",
    )
}

fn invalid_input(message: &str, column: Option<String>) -> dbms::Error {
    dbms::Error::new(
        dbms::ErrorKind::InvalidInput { column: column },
        message,
    )
}

fn unexisting_path(message: &str) -> dbms::Error {
    dbms::Error::new(
        dbms::ErrorKind::UnexistingPath,
        message,
    )
}

fn internal_error<T: ::std::fmt::Debug>(message: &T) -> dbms::Error {
    dbms::Error::new(
        dbms::ErrorKind::InternalError,
        &format!("{:#?}", message),
    )
}
