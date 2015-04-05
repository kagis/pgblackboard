use std::io::{self, Write};

pub trait View {

    fn render_intro(&mut self) -> io::Result<()>;

    fn render_outro(&mut self) -> io::Result<()>;

    fn render_rowset_begin(&mut self,
                           rowset_id: i32,
                           &[FieldDescription])
                           -> io::Result<()>;

    fn render_rowset_end(&mut self) -> io::Result<()>;

    fn render_row<'a, T>(&mut self, row: T) -> io::Result<()>
        where T: Iterator<Item=Option<&'a str>>;

    fn render_notice(&mut self, message: &str) -> io::Result<()>;

    fn render_sql_error(&mut self,
                        message: &str,
                        script_line: Option<usize>)
                        -> io::Result<()>;

    fn render_io_error(&mut self, io::Error) -> io::Result<()>;

    fn render_nonquery(&mut self, command_tag: &str) -> io::Result<()>;

    fn make_rowset_editable(&mut self,
                            rowset_id: i32,
                            table_name: &str,
                            col_names: &[&str],
                            pk_mask: &[bool])
                            -> io::Result<()>;
}

pub struct FieldDescription<'a, 'b> {
    name: &'a str,
    typ: &'b str,
    is_numeric: bool,
}


static INTRO_START: &'static [u8] = b"\
    <!DOCTYPE html>\
    <html>\
    <head>\
        <meta charset='utf-8' />\
        <title></title>\
";

static INTRO_END: &'static [u8] = b"\
    </head>\
    <body>\
        <script>frameElement.setupPgBlackboardOutputFrame();</script>\
        <div class='main'>\
";


pub struct TableView<W: Write> {
    writer: W
}

impl<W: Write> TableView<W> {
    pub fn new(writer: W) -> TableView<W> {
        TableView { writer: writer }
    }
}

impl<W: Write> View for TableView<W> {

    fn render_intro(&mut self) -> io::Result<()> {
        let ref mut writer = self.writer;
        try!(writer.write_all(INTRO_START));
        try!(writer.write_all(b"\
            <link href='table.css' rel='stylesheet' />\
            <script src='table.js' async='async'></script>"));
        try!(writer.write_all(INTRO_END));
        Ok(())
    }

    fn render_outro(&mut self) -> io::Result<()> {
        self.writer.write_all(b"</div></body></html>")
    }

    fn render_rowset_begin(&mut self,
                           rowset_id: i32,
                           cols_descr: &[FieldDescription])
                           -> io::Result<()>
    {
        let out = &mut self.writer;

        let numeric_cols = cols_descr.iter()
                                     .enumerate()
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
                colname = col.name,
                coltype = col.typ));
        }
        try!(out.write_all(b"</tr>"));
        Ok(())
    }

    fn render_rowset_end(&mut self) -> io::Result<()> {
        let writer = &mut self.writer;
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
        try!(write!(&mut self.writer, "<script>pgBlackboard\
                                .makeRowsetEditable();\
                                </script>"));

        Ok(())
    }

    fn render_row<'a, T>(&mut self, row: T) -> io::Result<()>
        where T: Iterator<Item=Option<&'a str>> {

        let writer = &mut self.writer;
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
        write!(&mut self.writer, "<pre>{:?}</pre>", err)
    }

    fn render_sql_error(&mut self,
                        message: &str,
                        script_line: Option<usize>)
                        -> io::Result<()>
    {
        let writer = &mut self.writer;
        try!(invoke_js_set_error(writer, message, script_line.unwrap_or(0)));
        try!(writer.write_all(b"<pre>"));
        try!(writer.write_all(message.as_bytes()));
        try!(writer.write_all(b"</pre>"));
        Ok(())
    }

    fn render_notice(&mut self, message: &str) -> io::Result<()> {
        let writer = &mut self.writer;
        try!(writer.write_all(b"<pre>"));
        try!(writer.write_all(message.as_bytes()));
        try!(writer.write_all(b"</pre>"));
        Ok(())
    }

    fn render_nonquery(&mut self, command_tag: &str) -> io::Result<()> {
        let writer = &mut self.writer;
        try!(writer.write_all(b"<pre>"));
        try!(writer.write_all(command_tag.as_bytes()));
        try!(writer.write_all(b"</pre>"));
        Ok(())
    }
}


// pub struct MapView<W: Write> {
//     inner: W
// }

// impl<W: Write> View for MapView<W> {

// }



fn invoke_js_set_error<W>(writer: &mut W,
                          message: &str,
                          script_line: usize)
                          -> io::Result<()>
                          where W: Write
{
    write!(writer,
       "<script>pgBlackboard.setError('{message}', {line});</script>",
       message = message.replace("'", "\\'"),
       line = script_line)
}

fn main() {
    let mut view = TableView::new(io::stdout());

    view.render_intro().unwrap();
    view.render_rowset_begin(1, &[
        FieldDescription { name: "one", typ: "text", is_numeric: false },
        FieldDescription { name: "two", typ: "int", is_numeric: true },
    ]);

    let row = vec![
        Some("foo".to_string()),
        Some("bar".to_string()),
    ];

    let row_iter = row.iter().map(|maybe_val| {
        maybe_val.as_ref().map(|val| &val[..])
    });

    view.render_row(row_iter).unwrap();
    view.render_rowset_end().unwrap();

    view.render_sql_error("err message", Some(1)).unwrap();

    view.render_outro().unwrap();
}

