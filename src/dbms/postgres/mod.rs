mod connection;
mod decoder;
mod tree;
mod execiter;

use self::connection::*;
use self::tree::DbObjType;
use self::execiter::PgExecIter;
use super::*;
use std::ops::Range;

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
        let mut conn = try!(connect(
            &self.addr[..],
            database,
            user,
            password
        ));

        let parent_dbobj_typ = try!(DbObjType::from_str(parent_dbobj_typ)
                                        .ok_or(DbObjError::UnknownDbObjType));

        let query = parent_dbobj_typ.children_query();

        let children = {
            try!(conn.parse_statement("", query));
            let mut cursor = conn.execute_statement("", &[
                Some(parent_dbobj_id),
                Some(parent_dbobj_typ.to_str())
            ]);
            let mut result = vec![];
            for row in cursor.by_ref() {
                result.push(try!(decoder::decode_row::<DbObj>(row).map_err(|err| {
                    DbObjError::InternalError(Box::new(err))
                })));
            }
            try!(cursor.complete());
            result
        };

        try!(conn.close());

        Ok(children)
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
        let mut conn = try!(connect(
            &self.addr[..],
            database,
            user,
            password
        ));

        let dbobj_typ = try!(DbObjType::from_str(dbobj_typ)
                                        .ok_or(DbObjError::UnknownDbObjType));

        let query = dbobj_typ.definition_query();

        let def = {
            #[derive(RustcDecodable)]
            struct DbObjDefinition {
                def: String,
            }

            try!(conn.parse_statement("", query));
            let mut cursor = conn.execute_statement("", &[Some(dbobj_id)]);
            let mut result = vec![];
            for row in cursor.by_ref() {
                result.push(try!(decoder::decode_row::<DbObjDefinition>(row).map_err(|err| {
                    DbObjError::InternalError(Box::new(err))
                })));
            }
            try!(cursor.complete());
            try!(result.pop().ok_or(DbObjError::DbObjNotFound)).def
        };

        try!(conn.close());

        Ok([
            "\\connect ",
            database,
            "\r\n\r\n",
            &def[..]
        ].concat())
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

// #[test]
// fn dbobj() {
//     let dbms = PgDbms {
//         addr: "localhost:5432".to_string()
//     };

//     let databases = dbms.get_root_dbobjs("postgres", "postgres").unwrap();
//     panic!(format!("{:#?}", databases));
// }
