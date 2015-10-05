mod sql;
mod connection;
mod decoder;

use super::*;
use self::connection::*;

pub struct DbmsImpl {
    addr: String,
}

impl Dbms for DbmsImpl {
    type ExecIter = ExecIterImpl;

    fn execute_script(
        &self,
        user: &str,
        password: &str,
        script: &str,
        char_offset: usize,
        char_len: usize)
        -> Self::ExecIter
    {
        unimplemented!();
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
        let mut conn = try!(connect(
            &self.addr[..],
            "postgres",
            user,
            password
        ));

        let dbobjs = {
            try!(conn.parse_statement("", include_str!("tree/children/databases.sql")));
            let mut cursor = conn.execute_statement("", &[]);
            let mut dbobjs = vec![];
            for row in cursor.by_ref() {
                dbobjs.push(try!(decoder::decode_row::<DbObj>(row).map_err(|err| {
                    DbObjError::InternalError(Box::new(err))
                })));
            }
            try!(cursor.complete());
            dbobjs
        };

        try!(conn.close());

        Ok(dbobjs)
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
        unimplemented!();
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
        unimplemented!();
    }
}

pub struct ExecIterImpl {
    conn: Connection
}

impl Iterator for ExecIterImpl {
    type Item = ExecEvent;

    fn next(&mut self) -> Option<Self::Item> {
        unimplemented!();
    }
}

impl ::std::convert::From<connection::Error> for DbObjError {
    fn from(err: connection::Error) -> DbObjError {
        match err {
            connection::Error::SqlError(sql_err) => match sql_err.code.class() {
                SqlStateClass::InvalidCatalogName => DbObjError::DatabaseNotFound,
                _ => DbObjError::InternalError(Box::new(sql_err))
            },
            connection::Error::IoError(io_err) => DbObjError::InternalError(Box::new(io_err))
        }
    }
}

#[test]
fn dbobj() {
    let dbms = DbmsImpl {
        addr: "localhost:5432".to_string()
    };

    let databases = dbms.get_root_dbobjs("postgres", "postgres").unwrap();
    panic!(format!("{:#?}", databases));
}
