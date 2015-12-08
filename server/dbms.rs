use std::collections::BTreeMap;
use rustc_serialize::json;
use std::ops::Range;

pub trait Dbms {

    type ExecIter: Iterator<Item=ExecEvent> + 'static;

    fn execute_script(
        &self,
        credentials: Credentials,
        script: &str,
        selection: Option<Range<usize>>)
        -> Self::ExecIter;

    fn insert_row(
        &self,
        credentials: Credentials,
        table_path: &[&str],
        row: &DictRow)
        -> Result<DictRow>;

    fn update_row(
        &self,
        credentials: Credentials,
        table_path: &[&str],
        key: &DictRow,
        changes: &DictRow)
        -> Result<DictRow>;

    fn delete_row(
        &self,
        credentials: Credentials,
        table_path: &[&str],
        key: &DictRow)
        -> Result<DictRow>;

    fn get_root_dbobjs(
        &self,
        credentials: Credentials)
        -> Result<Vec<DbObj>>;

    fn get_child_dbobjs(
        &self,
        credentials: Credentials,
        parent_obj_path: &[&str])
        -> Result<Vec<DbObj>>;

    fn get_dbobj_script(
        &self,
        credentials: Credentials,
        obj_path: &[&str])
        -> Result<String>;
}

pub type Credentials<'user, 'pwd> = (&'user str, &'pwd str);

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
#[derive(RustcEncodable)]
pub struct Field {
    pub name: String,
    pub typ: String,
    pub is_num: bool,
    pub is_geojson: bool,
    pub src_column: Option<Column>,
}

/// Describes column of table
#[derive(Debug)]
#[derive(RustcEncodable)]
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
#[derive(RustcEncodable)]
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
#[derive(RustcEncodable)]
#[cfg_attr(test, derive(PartialEq))]
pub enum ErrorKind {
    InvalidCredentials,

    // Requesting table or other database object not found
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
    pub path: Vec<String>,
    pub name: String,
    pub comment: Option<String>,
    pub typ: String,
    pub can_have_children: bool,
    pub group: String,
}
