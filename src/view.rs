use std::io::{self, Write};

pub trait View {
    //fn new<TWriter: Writer>(writer: TWriter) -> Self;

    fn render_rowset_begin(&mut self,
                           rowset_id: i32,
                           &[FieldDescription])
                           -> io::Result<()>;

    fn render_rowset_end(&mut self) -> io::Result<()>;

    fn render_row<'a, T>(&mut self, row: T) -> io::Result<()>
        where T: Iterator<Item=Option<&'a str>>;

    fn make_rowset_editable(&mut self,
                            rowset_id: i32,
                            table_name: &str,
                            col_names: &[&str],
                            pk_mask: &[bool])
                            -> io::Result<()>;

    fn render_notice(&mut self, message: &str) -> io::Result<()>;

    fn render_sql_error(&mut self,
                        message: &str,
                        script_line: Option<usize>)
                        -> io::Result<()>;

    fn render_io_error(&mut self, io::Error) -> io::Result<()>;

    fn render_nonquery(&mut self, command_tag: &str) -> io::Result<()>;
}

pub struct FieldDescription<'a, 'b> {
    name: &'a str,
    typ: &'b str,
    is_numeric: bool,
}




struct TableView<T: Write>(T);

impl<W: Write> View for TableView<W> {

    fn render_rowset_begin(&mut self,
                           rowset_id: i32,
                           cols_descr: &[FieldDescription])
                           -> io::Result<()>
    {
        let out = &mut self.0;

        let numeric_cols = cols_descr.iter().enumerate()
                                     .filter(|&(i, col)| col.is_numeric)
                                     .map(|(i, col)| i + 1);

        try!(out.write_all(b"<style>"));
        for i in numeric_cols {
            try!(write!(out, "#rowset{} td:nth-child({}),", rowset_id, i));
        }
        try!(out.write_all(b"{ text-align: right; }"));
        try!(out.write_all(b"</style>"));

        try!(write!(out, "<table class='rowset' id='rowset{}'>", rowset_id));
        try!(out.write_all(b"<tr>"));
        try!(out.write_all(b"<th class='rowset-corner'></th>"));
        for col in cols_descr {
            try!(write!(out,
                "<th class='rowset-colheader'>\
                    {colname}\
                    <small class='rowset-coltype'>\
                        {coltype}\
                    </small>\
                <th>",
                colname=col.name,
                coltype=col.typ));
        }
        try!(out.write_all(b"</tr>"));
        Ok(())
    }

    fn render_rowset_end(&mut self) -> io::Result<()> {
        let writer = &mut self.0;
        try!(writer.write_all(b"</table>"));
        Ok(())
    }

    fn make_rowset_editable(&mut self,
                            rowset_id: i32,
                            table_name: &str,
                            col_names: &[&str],
                            pk_mask: &[bool])
                            -> io::Result<()>
    {
        Ok(())
    }

    fn render_row<'a, T>(&mut self, row: T) -> io::Result<()>
        where T: Iterator<Item=Option<&'a str>> {

        let writer = &mut self.0;
        try!(writer.write_all(b"<tr>"));
        try!(writer.write_all(b"<th></th>"));
        for maybe_val in row {
            try!(match maybe_val {
                Some("") => writer.write_all(b"<td class='emptystr'></td>"),
                Some(val) => write!(writer, "<td>{}</td>", val),
                None => writer.write_all(b"<td></td>"),
            });
        }
        try!(writer.write_all(b"</tr>"));
        Ok(())
    }

    fn render_io_error(&mut self, err: io::Error) -> io::Result<()> {
        write!(&mut self.0, "<pre>{:?}</pre>", err)
    }

    fn render_sql_error(&mut self,
                        message: &str,
                        script_line: Option<usize>)
                        -> io::Result<()>
    {
        let writer = &mut self.0;
        try!(writer.write_all(b"<pre>"));
        try!(writer.write_all(message.as_bytes()));
        try!(writer.write_all(b"</pre>"));
        Ok(())
    }

    fn render_notice(&mut self, message: &str) -> io::Result<()> {
        let writer = &mut self.0;
        try!(writer.write_all(b"<pre>"));
        try!(writer.write_all(message.as_bytes()));
        try!(writer.write_all(b"</pre>"));
        Ok(())
    }

    fn render_nonquery(&mut self, command_tag: &str) -> io::Result<()> {
        let writer = &mut self.0;
        try!(writer.write_all(b"<pre>"));
        try!(writer.write_all(command_tag.as_bytes()));
        try!(writer.write_all(b"</pre>"));
        Ok(())
    }
}


fn main() {
    let mut view = TableView(io::stdout());

    view.render_rowset_begin(1, &[
        FieldDescription { name: "one", typ: "text", is_numeric: false },
        FieldDescription { name: "two", typ: "int", is_numeric: true },
    ]);
    view.render_row(vec![
        Some("foo"),
        Some("bar"),
    ].into_iter()).unwrap();
}
