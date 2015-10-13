use super::View;
use super::linecol::LineCol;
use dbms::{ Field, QueryPlanNode };
use std::io::{ self, Write };
use rustc_serialize::json;

pub struct MapView<W: Write> {
    writer: W,
    rendered_rows_count: usize,
    geom_col_idx: Option<usize>
}

impl<W: Write> MapView<W> {
    pub fn new(writer: W) -> MapView<W> {
        MapView {
            writer: writer,
            rendered_rows_count: 0,
            geom_col_idx: None
        }
    }
}

impl<W: Write> View for MapView<W> {

    fn render_intro(
        &mut self)
        -> io::Result<()>
    {
        let ref mut writer = self.writer;
        try!(writer.write_all(INTRO));
        try!(writer.write_all(b"<script>frameElement\
                                .setupPgBlackboardOutputFrame('map');\
                                </script>"));
        Ok(())
    }

    fn render_outro(
        &mut self)
        -> io::Result<()>
    {
        self.writer.write_all(OUTRO)
    }

    fn render_rowset_begin(
        &mut self,
        cols_descr: &[Field])
        -> io::Result<()>
    {
        self.rendered_rows_count = 0;
        self.geom_col_idx = cols_descr.iter().position(|col| {
            use std::ascii::AsciiExt;
            col.name.eq_ignore_ascii_case("st_asgeojson")
        });

        if self.geom_col_idx.is_some() {
            try!(write!(self.writer, "<script>pgBlackboardOutput\
                                .beginFeatureCollection();\
                                </script>"));
        }

        Ok(())
    }

    fn render_rowset_end(
        &mut self)
        -> io::Result<()>
    {
        if self.rendered_rows_count > 0 {
            try!(self.writer.write_all(b"]});</script>"));
        }

        Ok(())
    }

    fn render_row<'a, T>(
        &mut self,
        row: T,
        descrs: &[Field])
        -> io::Result<()>
        where T: Iterator<Item=Option<&'a str>>
    {
        let geom_col_idx = match self.geom_col_idx {
            Some(it) => it,
            None => return Ok(())
        };

        if self.rendered_rows_count > 50 {
            try!(self.writer.write_all(b"]});</script>"));
            self.rendered_rows_count = 0;
        }

        if self.rendered_rows_count == 0 {
            try!(self.writer.write_all(b"<script>\
                pgBlackboardOutput.addFeatures({\
                type:'FeatureCollection',\
                features:["));
        }



        // try!(enc.emit_struct("", 3, || {
        //     Ok(())
        // }));

        try!(self.writer.write_all(b"{\
            type:'Feature',\
            properties:{"));

        let mut geom = None;
        for (idx, (val, descr)) in row.zip(descrs).enumerate() {
            if idx ==  geom_col_idx {
                geom = val;
            } else {
                try!(write!(
                    self.writer,
                    "{}: {},",
                    json::as_json(&descr.name),
                    json::as_json(&val)));
            }
        }

        try!(self.writer.write_all(b"},geometry:"));
        try!(match geom {
            Some(geom) => self.writer.write_all(geom.as_bytes()),
            None => self.writer.write_all(b"null")
        });

        try!(self.writer.write_all(b"},"));

        self.rendered_rows_count += 1;

        Ok(())
    }

    fn render_notice(
        &mut self,
        message: &str,
        linecol: Option<LineCol>)
        -> io::Result<()>
    {
        self.writer.write_all(b"")
    }

    fn render_error(
        &mut self,
        message: &str,
        linecol: Option<LineCol>)
        -> io::Result<()>
    {
        self.writer.write_all(b"")
    }

    fn render_nonquery(
        &mut self,
        command_tag: &str)
        -> io::Result<()>
    {
        self.writer.write_all(b"")
    }

    fn render_queryplan(
        &mut self,
        plan: &QueryPlanNode)
        -> io::Result<()>
    {
        Ok(())
    }
}

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
