mod table;
mod map;

pub use self::table::TableView;
pub use self::map::MapView;

use std::io;
use rustc_serialize::json;
use pg;

pub trait View {

    fn render_intro(&mut self) -> io::Result<()>;

    fn render_outro(&mut self) -> io::Result<()>;

    fn render_rowset_begin(&mut self,
                           rowset_id: i32,
                           &[pg::FieldDescription])
                           -> io::Result<()>;

    fn render_rowset_end(&mut self) -> io::Result<()>;

    fn render_row<'a, T>(&mut self,
                         row: T,
                         descrs: &[pg::FieldDescription])
                         -> io::Result<()>
        where T: Iterator<Item=Option<&'a str>>;

    fn render_notice(&mut self,
                     message: &str)
                     -> io::Result<()>;

    fn render_error(&mut self,
                    message: &str,
                    script_line: usize,
                    script_col: usize)
                    -> io::Result<()>;

    fn render_nonquery(&mut self,
                       command_tag: &str)
                       -> io::Result<()>;

    fn make_rowset_editable(&mut self,
                            rowset_id: i32,
                            editable_table: &EditableTable)
                            -> io::Result<()>;

    fn render_queryplan(&mut self, plan: &QueryPlan) -> io::Result<()>;

    // fn flush(&self) -> io::Result<()>;
}

#[derive(Debug)]
#[derive(RustcEncodable)]
pub struct EditableTable {
    pub dbname: String,
    pub table_id: String,
    pub columns: Vec<EditableColumn>
}

#[derive(Debug)]
#[derive(RustcEncodable)]
pub struct EditableColumn {
    pub field_idx: Option<usize>,
    pub column_id: String,
    pub is_key: bool,
    pub is_notnull: bool,
    pub has_default: bool
}

#[derive(Debug)]
#[derive(RustcEncodable)]
pub struct QueryPlan {
    pub heat: Option<f64>,
    pub typ: String,
    pub properties: json::Object,
    pub children: Vec<QueryPlan>
}
