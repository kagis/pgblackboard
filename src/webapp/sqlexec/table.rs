use super::View;
use super::linecol::LineCol;
use dbms::{ Field, QueryPlanNode };
use std::io::{ self, Write };
use rustc_serialize::json;

static INTRO: &'static [u8] = b"\
    <!DOCTYPE html>\
    <html>\
    <head>\
        <meta charset='utf-8' />\
        <title></title>\
    </head>\
    <body><div class='main'>\
";

static OUTRO: &'static [u8] = b"</div></body></html>\r\n";


pub struct TableView<W: Write> {
    writer: W,
    last_rowset_id: usize
}

impl<W: Write> TableView<W> {
    pub fn new(writer: W) -> TableView<W> {
        TableView {
            writer: writer,
            last_rowset_id: 0,
        }
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

    fn render_rowset_begin(
        &mut self,
        cols_descr: &[Field])
        -> io::Result<()>
    {
        let out = &mut self.writer;
        self.last_rowset_id += 1;
        let rowset_id = self.last_rowset_id;

        let numeric_cols = cols_descr.iter()
                                     .enumerate()
                                     .filter(|&(_, col)| col.is_num)
                                     .map(|(i, _)| i + 1 /* rowheader */
                                                     + 1 /* one-based */);

        try!(out.write_all(b"<style>"));
        for (i, field_idx) in numeric_cols.enumerate() {
            if i > 0 {
                try!(write!(out, ","));
            }
            try!(write!(out, "#rowset{} td:nth-child({})", rowset_id, field_idx));
        }
        try!(out.write_all(b"{ text-align: right; }"));
        try!(out.write_all(b"</style>"));

        try!(write!(out, "<table class='rowset'>"));
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

    fn render_rowset_end(
        &mut self)
        -> io::Result<()>
    {
        let writer = &mut self.writer;
        try!(writer.write_all(b"</tbody>"));
        try!(writer.write_all(b"</table>"));
        Ok(())
    }

    fn render_row<'a, T>(
        &mut self,
        row: T,
        descrs: &[Field])
        -> io::Result<()>
        where T: Iterator<Item=Option<&'a str>>
    {

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

    fn render_error(
        &mut self,
        message: &str,
        linecol: Option<LineCol>)
        -> io::Result<()>
    {
        let writer = &mut self.writer;
        try!(invoke_js_set_error(writer, message, linecol));
        try!(writer.write_all(b"<pre class=\"message message--error\">"));
        try!(writer.write_all(message.as_bytes()));
        try!(writer.write_all(b"</pre>"));
        Ok(())
    }

    fn render_notice(
        &mut self,
        message: &str,
        linecol: Option<LineCol>)
        -> io::Result<()>
    {
        let writer = &mut self.writer;
        try!(writer.write_all(b"<pre>"));
        try!(writer.write_all(message.as_bytes()));
        try!(writer.write_all(b"</pre>"));
        Ok(())
    }

    fn render_nonquery(
        &mut self,
        command_tag: &str)
        -> io::Result<()>
    {
        let writer = &mut self.writer;
        try!(writer.write_all(b"<pre>"));
        try!(writer.write_all(command_tag.as_bytes()));
        try!(writer.write_all(b"</pre>"));
        Ok(())
    }

    fn render_queryplan(
        &mut self,
        plan: &QueryPlanNode)
        -> io::Result<()>
    {
        write!(self.writer,
               "<script>pgBlackboardOutput.queryPlan({});</script>",
               json::as_json(plan))
    }

    // fn flush(&self) -> io::Result<()> {
    //     self.writer.flush()
    // }
}

fn invoke_js_set_error<W>(
    writer: &mut W,
    message: &str,
    linecol: Option<LineCol>)
    -> io::Result<()>
    where W: Write
{
    write!(
        writer,
        "<script>pgBlackboardOutput.setError({{\
            \"message\":{message},\
            \"line\":{line}\
        }});</script>",
        message = json::as_json(&message),
        line = json::as_json(&linecol.map(|it| it.line))
    )
}
