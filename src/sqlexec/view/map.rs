use super::{View, FieldDescription};
use std::io::{self, Write};
use pg;

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

    fn render_intro(&mut self) -> io::Result<()> {
        let ref mut writer = self.writer;
        try!(writer.write_all(INTRO));
        try!(writer.write_all(b"<script>frameElement\
                                .setupPgBlackboardOutputFrame('map');\
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
        self.rendered_rows_count = 0;
        self.geom_col_idx = cols_descr.iter().position(|col| {
            use std::ascii::AsciiExt;
            col.name.eq_ignore_ascii_case("st_asgeojson")
        });

        write!(self.writer, "<script>pgBlackboard\
                            .beginCollection();\
                            </script>")
    }

    fn render_rowset_end(&mut self) -> io::Result<()> {
        if self.rendered_rows_count > 0 {
            try!(self.writer.write_all(b"]});</script>"));
        }

        Ok(())
    }

    fn render_row<'a, T>(&mut self,
                         row: T,
                         descrs: &[pg::FieldDescription])
                         -> io::Result<()>
        where T: Iterator<Item=Option<&'a str>>
    {
        if self.rendered_rows_count > 50 {
            try!(self.writer.write_all(b"]});</script>"));
            self.rendered_rows_count = 0;
        }

        if self.rendered_rows_count == 0 {
            try!(self.writer.write_all(b"<script>\
                pgBlackboard.addFeatures({\
                type:'FeatureCollection',\
                features:["));
        }

        try!(self.writer.write_all(b"{\
            type:'Feature',\
            properties:{"));

        let mut geom = None;
        for (idx, (val, descr)) in row.zip(descrs).enumerate() {
            if Some(idx) == self.geom_col_idx {
                geom = val;
            } else {
                try!(write!(
                    self.writer,
                    "{:?}: {:?},",
                    descr.name,
                    val.unwrap_or("null")));
            }
        }

        try!(self.writer.write_all(b"},geometry:"));
        try!(match geom {
            Some(geom) => write!(self.writer, "{:?}", geom),
            None => self.writer.write_all(b"null")
        });

        try!(self.writer.write_all(b"},"));

        self.rendered_rows_count += 1;

        Ok(())
    }

    fn render_notice(&mut self,
                     message: &str)
                     -> io::Result<()>
    {
        self.writer.write_all(b"")
    }

    fn render_error(&mut self,
                    message: &str,
                    script_line: usize,
                    script_col: usize)
                    -> io::Result<()>
    {
        self.writer.write_all(b"")
    }

    fn render_nonquery(&mut self,
                       command_tag: &str)
                       -> io::Result<()>
    {
        self.writer.write_all(b"")
    }

    fn make_rowset_editable(&mut self,
                            rowset_id: i32,
                            table_name: &str,
                            col_names: &[&str],
                            pk_mask: &[bool])
                            -> io::Result<()>
    {
        self.writer.write_all(b"")
    }
}

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
