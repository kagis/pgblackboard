mod table;
mod map;

pub use self::table::TableView;
pub use self::map::MapView;

use std::io;
use pg;

pub trait View {

    fn render_intro(&mut self) -> io::Result<()>;

    fn render_outro(&mut self) -> io::Result<()>;

    fn render_rowset_begin(&mut self,
                           rowset_id: i32,
                           &[FieldDescription])
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
                            table_name: &str,
                            col_names: &[&str],
                            pk_mask: &[bool])
                            -> io::Result<()>;

    // fn flush(&self) -> io::Result<()>;
}


pub struct FieldDescription<'a, 'b> {
    pub name: &'a str,
    pub typ: &'b str,
    pub is_numeric: bool,
}
