use std::collections::BTreeMap;
use rustc_serialize::json;
use std::ops::Range;

pub trait Dbms {

    type ExecIter: Iterator<Item=ExecEvent> + 'static;

    fn execute_script(
        &self,
        user: &str,
        password: &str,
        script: &str,
        selection: Option<Range<usize>>)
        -> Self::ExecIter;

    fn insert_row(
        &self,
        user: &str,
        password: &str,
        database: &str,
        table: &str,
        row: &DictRow)
        -> Result<DictRow, TableModifyError>;

    fn update_row(
        &self,
        user: &str,
        password: &str,
        database: &str,
        table: &str,
        key: &DictRow,
        changes: &DictRow)
        -> Result<DictRow, TableModifyError>;

    fn delete_row(
        &self,
        user: &str,
        password: &str,
        database: &str,
        table: &str,
        key: &DictRow)
        -> Result<DictRow, TableModifyError>;

    fn get_root_dbobjs(
        &self,
        user: &str,
        password: &str)
        -> Result<Vec<DbObj>, DbObjError>;

    fn get_child_dbobjs(
        &self,
        user: &str,
        password: &str,
        database: &str,
        parent_dbobj_typ: &str,
        parent_dbobj_id: &str)
        -> Result<Vec<DbObj>, DbObjError>;

    fn get_dbobj_script(
        &self,
        user: &str,
        password: &str,
        database: &str,
        dbobj_typ: &str,
        dbobj_id: &str)
        -> Result<String, DbObjError>;
}

pub type DictRow = BTreeMap<String, Option<String>>;

#[derive(Debug)]
pub enum ExecEvent {
    NonQuery {
        command_tag: String
    },

    RowsetBegin(Vec<Field>),

    Row(Vec<Option<String>>),

    QueryPlan(QueryPlanNode),

    Notice {
        message: String,
        bytepos: Option<usize>,
    },

    Error {
        message: String,
        bytepos: Option<usize>,
    }
}

/// Describes field of query result
#[derive(Debug)]
pub struct Field {
    pub name: String,
    pub typ: String,
    pub is_num: bool,
    pub src_column: Option<Column>,
}

/// Describes column of table
#[derive(Debug)]
pub struct Column {
    pub owner_database: String,
    pub owner_table: String,
    pub name: String,
    pub is_key: bool,
    pub is_notnull: bool,
    pub has_default: bool,
}

#[derive(Debug)]
#[derive(RustcEncodable)]
pub struct QueryPlanNode {

    /// Value 0 to 1
    pub heat: Option<f64>,
    pub typ: String,
    pub properties: json::Object,
    pub children: Vec<QueryPlanNode>,
}

#[derive(Debug)]
pub enum TableModifyError {
    DatabaseNotFound,
    InvalidCredentials,
    UnknownTable,
    RowNotFound,
    NotUniqueKey,
    EmptyKey,
    InvalidInput {
        column: Option<String>,
        message: String,
    },
    InternalError(Box<::std::error::Error>),
}

/// Describes database objects like tables, views, functions, triggers etc.
#[derive(RustcDecodable)]
#[derive(RustcEncodable)]
#[derive(Debug)]
#[derive(PartialEq)]
pub struct DbObj {

    /// Name of owner database
    database: String,
    id: String,
    typ: String,
    name: String,
    comment: Option<String>,
    has_children: bool,
}

/// Describes error which may occur while
/// retrieving information about database objects.
#[derive(Debug)]
pub enum DbObjError {

    /// Specified database name was not found.
    DatabaseNotFound,

    /// Authorization failed.
    InvalidCredentials,

    /// Unknown type of database object was specified.
    UnknownDbObjType,

    /// DbObjNotFound
    DbObjNotFound,

    /// Some other error
    InternalError(Box<::std::error::Error>),
}
