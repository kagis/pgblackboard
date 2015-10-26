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
        table_path: &[&str],
        row: &DictRow)
        -> Result<DictRow>;

    fn update_row(
        &self,
        user: &str,
        password: &str,
        table_path: &[&str],
        key: &DictRow,
        changes: &DictRow)
        -> Result<DictRow>;

    fn delete_row(
        &self,
        user: &str,
        password: &str,
        table_path: &[&str],
        key: &DictRow)
        -> Result<DictRow>;

    fn get_root_dbobjs(
        &self,
        user: &str,
        password: &str)
        -> Result<Vec<DbObj>>;

    fn get_child_dbobjs(
        &self,
        user: &str,
        password: &str,
        parent_obj_path: &[&str])
        -> Result<Vec<DbObj>>;

    fn get_dbobj_script(
        &self,
        user: &str,
        password: &str,
        obj_path: &[&str])
        -> Result<String>;
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

pub type Result<T> = ::std::result::Result<T, Error>;

#[derive(Debug)]
pub struct Error {
    pub kind: ErrorKind,
    pub message: String,
}

impl Error {
    pub fn new(kind: ErrorKind, message: &str) -> Error {
        Error {
            kind: kind,
            message: message.to_string(),
        }
    }
}

impl ::std::fmt::Display for Error {
    fn fmt(&self, f: &mut ::std::fmt::Formatter) -> ::std::fmt::Result {
        write!(f, "{:#?}", self)
    }
}

impl ::std::error::Error for Error {
    fn description(&self) -> &str {
        &self.message
    }
}

#[derive(Debug)]
#[cfg_attr(test, derive(PartialEq))]
pub enum ErrorKind {
    InvalidCredentials,

    // Requesting table not exists
    UnexistingPath,

    // Row with specified key was not found
    UnexistingRow,

    // More than one row will be affected
    AmbiguousKey,

    // Invalid column value was specified
    InvalidInput { column: Option<String> },

    InternalError,
}

/// Describes database objects like tables, views, functions, triggers etc.
#[derive(RustcDecodable)]
#[derive(RustcEncodable)]
#[derive(Debug)]
#[derive(PartialEq)]
pub struct DbObj {

    /// Name of owner database
    pub database: String,
    pub id: String,
    pub typ: String,
    pub name: String,
    pub comment: Option<String>,

    // TODO: can_have_children
    pub has_children: bool,
}
//
// /// Describes error which may occur while
// /// retrieving information about database objects.
// #[derive(Debug)]
// pub enum DbObjError {
//
//     /// Specified database name was not found.
//     DatabaseNotFound,
//
//     /// Authorization failed.
//     InvalidCredentials,
//
//     /// Unknown type of database object was specified.
//     UnknownDbObjType,
//
//     /// DbObjNotFound
//     DbObjNotFound,
//
//     /// Some other error
//     InternalError(Box<::std::error::Error>),
// }
