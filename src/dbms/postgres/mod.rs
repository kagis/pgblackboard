mod connection;
mod decoder;
mod tree;
mod execiter;

use self::connection::*;
use self::tree::DbObjType;
use self::execiter::PgExecIter;
use super::*;
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
        schema: &str,
        table: &str,
        row: &DictRow)
        -> Result<DictRow, TableModifyError>
    {
        unimplemented!();
    }

    fn update_row(
        &self,
        user: &str,
        password: &str,
        database: &str,
        schema: &str,
        table: &str,
        key: &DictRow,
        changes: &DictRow)
        -> Result<DictRow, TableModifyError>
    {
        unimplemented!();
    }

    fn delete_row(
        &self,
        user: &str,
        password: &str,
        database: &str,
        schema: &str,
        table: &str,
        key: &DictRow)
        -> Result<(), TableModifyError>
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

        let parent_dbobj_typ = try!(DbObjType::from_str(parent_dbobj_typ)
                                        .ok_or(DbObjError::UnknownDbObjType));

        let query = parent_dbobj_typ.children_query();

        query_dbobj(conn, query, &[
            Some(parent_dbobj_id),
            Some(parent_dbobj_typ.to_str())
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

        let dbobj_typ = try!(DbObjType::from_str(dbobj_typ)
                                        .ok_or(DbObjError::UnknownDbObjType));

        let query = dbobj_typ.definition_query();

        #[derive(RustcDecodable)]
        struct DbObjDef { def: String }
        let mut defs = try!(query_dbobj::<DbObjDef>(conn, query, &[Some(dbobj_id)]));
        let def = try!(defs.pop().ok_or(DbObjError::DbObjNotFound)).def;

        Ok([
            "\\connect ",
            database,
            "\r\n\r\n",
            &def[..]
        ].concat())
    }
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
        let (rows, cmdtag) = try!(self.execute_statement_into_vec(stmt_name, params));
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

// #[test]
// fn dbobj() {
//     let dbms = PgDbms {
//         addr: "localhost:5432".to_string()
//     };

//     let databases = dbms.get_root_dbobjs("postgres", "postgres").unwrap();
//     panic!(format!("{:#?}", databases));
// }
