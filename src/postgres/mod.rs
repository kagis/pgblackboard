mod connection;
mod decoder;
mod tree;
mod execiter;
mod sql;

#[cfg(test)]
mod tests;

use self::connection::{connect, Connection, SqlState, SqlStateClass, Oid};
use self::tree::{definition_query, children_query};
use self::execiter::PgExecIter;
use self::sql::{quote_ident, quote_literal};
use dbms::*;
use std::ops::Range;
use rustc_serialize::Decodable;

pub struct PgDbms {
    pub addr: String,
}

impl Dbms for PgDbms {
    type ExecIter = PgExecIter;

    fn execute_script(
        &self,
        user: &str,
        password: &str,
        script: &str,
        selection: Option<Range<usize>>)
        -> Self::ExecIter
    {
        PgExecIter::new(
            &self.addr[..],
            user,
            password,
            script,
            selection,
        )
    }

    fn insert_row(
        &self,
        user: &str,
        password: &str,
        database: &str,
        table: &str,
        row: &DictRow)
        -> Result<DictRow, TableModifyError>
    {
        let mut conn = try!(connect(
            &self.addr[..],
            database,
            user,
            password
        ));

        let table_oid = try!(table.parse().map_err(|_| TableModifyError::UnknownTable));
        let full_table_name = try!(resolve_table_oid(&mut conn, table_oid));

        Ok({
            let mut result = DictRow::new();
            result.insert("full_table_name".to_string(), Some(full_table_name));
            result
        })
    }

    fn update_row(
        &self,
        user: &str,
        password: &str,
        database: &str,
        table: &str,
        key: &DictRow,
        changes: &DictRow)
        -> Result<DictRow, TableModifyError>
    {
        if key.is_empty() {
            return Err(TableModifyError::EmptyKey);
        }

        let mut conn = try!(connect(
            &self.addr[..],
            database,
            user,
            password
        ));

        let table_oid = try!(table.parse().map_err(|_| TableModifyError::UnknownTable));
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
            connection::Error::SqlError(sql_err) => TableModifyError::InvalidInput {
                message: sql_err.message,
                column: sql_err.position
                    .and_then(|pos| column_names_by_values_positions.get(&pos))
                    .map(|it| it.clone())
            },
            other => TableModifyError::InternalError(Box::new(other)),
        }));

        let mut rows = rows.into_iter();
        let returned_row = try!(rows.next().ok_or(TableModifyError::RowNotFound));
        try!(rows.next().map(|_| Err(TableModifyError::NotUniqueKey)).unwrap_or(Ok(())));

        try!(conn.query::<()>("COMMIT", &[]).map_err(|err| match err {
            connection::Error::SqlError(sql_err) => TableModifyError::InvalidInput {
                message: sql_err.message,
                column: None
            },
            connection::Error::IoError(io_err) => {
                TableModifyError::InternalError(Box::new(io_err))
            }
            other => TableModifyError::InternalError(Box::new(other))
        }));

        let dict = descr.iter()
                        .map(|field_descr| field_descr.name.clone())
                        .zip(returned_row)
                        .collect::<DictRow>();

        Ok(dict)

    }

    fn delete_row(
        &self,
        user: &str,
        password: &str,
        database: &str,
        table: &str,
        key: &DictRow)
        -> Result<DictRow, TableModifyError>
    {
        unimplemented!();
    }

    fn get_root_dbobjs(
        &self,
        user: &str,
        password: &str)
        -> Result<Vec<DbObj>, DbObjError>
    {
        let conn = try!(connect(
            &self.addr[..],
            "postgres",
            user,
            password
        ));

        query_dbobj(
            conn,
            include_str!("tree/children/databases.sql"),
            &[]
        )
    }

    fn get_child_dbobjs(
        &self,
        user: &str,
        password: &str,
        database: &str,
        parent_dbobj_typ: &str,
        parent_dbobj_id: &str)
        -> Result<Vec<DbObj>, DbObjError>
    {
        let conn = try!(connect(
            &self.addr[..],
            database,
            user,
            password
        ));

        let query = try!(children_query(parent_dbobj_typ)
                            .ok_or(DbObjError::UnknownDbObjType));

        query_dbobj(conn, &query, &[
            Some(parent_dbobj_id),
            Some(parent_dbobj_typ),
        ])
    }

    fn get_dbobj_script(
        &self,
        user: &str,
        password: &str,
        database: &str,
        dbobj_typ: &str,
        dbobj_id: &str)
        -> Result<String, DbObjError>
    {
        let conn = try!(connect(
            &self.addr[..],
            database,
            user,
            password
        ));

        let query = try!(definition_query(dbobj_typ)
                            .ok_or(DbObjError::UnknownDbObjType));

        let mut defs = try!(query_dbobj::<(String,)>(conn, &query, &[Some(dbobj_id)]));
        let (def,) = try!(defs.pop().ok_or(DbObjError::DbObjNotFound));

        Ok(def)
    }
}

fn resolve_table_oid(
    conn: &mut Connection,
    table_oid: Oid)
    -> Result<String, TableModifyError>
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
        .ok_or(TableModifyError::UnknownTable)
}

fn query_dbobj<TRecord: Decodable>(
    mut conn: Connection,
    stmt_body: &str,
    params: &[Option<&str>])
    -> Result<Vec<TRecord>, DbObjError>
{
    let (_cmdtag, records) = try!(conn.query(stmt_body, params));
    try!(conn.close());
    Ok(records)
}


impl ::std::convert::From<connection::Error> for DbObjError {
    fn from(err: connection::Error) -> DbObjError {
        match err {
            connection::Error::SqlError(sql_err) => match sql_err.code.class() {
                SqlStateClass::InvalidCatalogName => DbObjError::DatabaseNotFound,
                _ => DbObjError::InternalError(Box::new(sql_err))
            },
            connection::Error::IoError(io_err) => DbObjError::InternalError(Box::new(io_err)),
            connection::Error::OtherError(err) => DbObjError::InternalError(err),
        }
    }
}

impl ::std::convert::From<connection::Error> for TableModifyError {
    fn from(err: connection::Error) -> TableModifyError {
        match err {
            connection::Error::SqlError(sql_err) => match sql_err.code.class() {
                SqlStateClass::InvalidCatalogName => TableModifyError::DatabaseNotFound,
                _ => TableModifyError::InternalError(Box::new(sql_err))
            },
            connection::Error::IoError(io_err) => TableModifyError::InternalError(Box::new(io_err)),
            connection::Error::OtherError(err) => TableModifyError::InternalError(err),
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
