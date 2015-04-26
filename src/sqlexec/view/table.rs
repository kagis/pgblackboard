use super::{View, FieldDescription};
use std::io::{self, Write};
use pg;

static INTRO: &'static [u8] = b"\
    <!DOCTYPE html>\
    <html>\
    <head>\
        <meta charset='utf-8' />\
        <title></title>\
    </head>\
    <body>\
";

static OUTRO: &'static [u8] = b"</body></html>\r\n";


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
        try!(writer.write_all(INTRO));
        try!(writer.write_all(b"<script>frameElement\
                                .setupPgBlackboardOutputFrame('table');\
                                </script>"));
        Ok(())
    }

    fn render_outro(&mut self) -> io::Result<()> {
        self.writer.write_all(OUTRO)
    }

    fn render_rowset_begin(&mut self,
                           rowset_id: i32,
                           cols_descr: &[FieldDescription])
                           -> io::Result<()>
    {
        let out = &mut self.writer;

        let numeric_cols = cols_descr.iter()
                                     .enumerate()
                                     .filter(|&(_, col)| col.is_numeric)
                                     .map(|(i, _)| i + 1);

        try!(out.write_all(b"<style>"));
        for i in numeric_cols {
            try!(write!(out, "#rowset{} td:nth-child({}),", rowset_id, i));
        }
        try!(out.write_all(b"{ text-align: right; }"));
        try!(out.write_all(b"</style>"));

        try!(write!(out, "<table class='rowset' id='rowset{}'>", rowset_id));
        try!(out.write_all(b"<thead>"));
        try!(out.write_all(b"<tr>"));
        try!(out.write_all(b"<th class='rowset-corner'></th>"));
        for col in cols_descr {
            try!(write!(out,
                "<th class='rowset-colheader'>\
                    {colname}\
                    <small class='rowset-coltype'>\
                        {coltype}\
                    </small>\
                </th>",
                colname = col.name,
                coltype = col.typ));
        }
        try!(out.write_all(b"</tr>"));
        try!(out.write_all(b"</thead>"));
        try!(out.write_all(b"<tbody>"));
        try!(out.flush());
        Ok(())
    }

    fn render_rowset_end(&mut self) -> io::Result<()> {
        let writer = &mut self.writer;
        try!(writer.write_all(b"</tbody>"));
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

    fn render_row<'a, T>(&mut self,
                         row: T,
                         descrs: &[pg::FieldDescription])
                         -> io::Result<()>
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

    fn render_error(&mut self,
                    message: &str,
                    script_line: usize,
                    script_col: usize)
                    -> io::Result<()>
    {
        let writer = &mut self.writer;
        try!(invoke_js_set_error(writer, message, script_line));
        try!(writer.write_all(b"<pre class=\"message message--error\">"));
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

    // fn flush(&self) -> io::Result<()> {
    //     self.writer.flush()
    // }
}






fn invoke_js_set_error<W>(writer: &mut W,
                          message: &str,
                          script_line: usize)
                          -> io::Result<()>
                          where W: Write
{
    write!(writer,
        "<script>pgBlackboard.setError({{\
            \"message\":{message:?},\
            \"line\":{line}\
        }});</script>",
        message = message,
        line = script_line)
}
