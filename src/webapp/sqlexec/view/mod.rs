mod table;
mod map;

pub use self::table::TableView;
pub use self::map::MapView;

use std::io;
use pg;

pub trait View {

    fn render_intro(
        &mut self)
        -> io::Result<()>;

    fn render_outro(
        &mut self)
        -> io::Result<()>;

    fn render_rowset_begin(
        &mut self,
       rowset_id: i32,
       &[Field])
       -> io::Result<()>;

    fn render_rowset_end(
        &mut self)
        -> io::Result<()>;

    fn render_row<'a, T>(
        &mut self,
        row: T,
        descrs: &[Field])
        -> io::Result<()>
        where T: Iterator<Item=Option<&'a str>>;

    fn render_notice(
        &mut self,
        message: &str)
        -> io::Result<()>;

    fn render_error(
        &mut self,
        message: &str,
        script_line: usize,
        script_col: usize)
        -> io::Result<()>;

    fn render_nonquery(
        &mut self,
        command_tag: &str)
        -> io::Result<()>;

    fn render_queryplan(
        &mut self,
        plan: &QueryPlanNode)
        -> io::Result<()>;

    // fn flush(&self) -> io::Result<()>;
}

