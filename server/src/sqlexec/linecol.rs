#[derive(Debug)]
#[derive(Eq, PartialEq)]
#[derive(Ord, PartialOrd)]
#[derive(Clone, Copy)]
pub struct LineCol {
    /// 0-based line number
    pub line: usize,
    /// 0-based char position
    pub col: usize
}

impl LineCol {
    pub fn new(line: usize, col: usize) -> LineCol {
        LineCol { line: line, col: col }
    }

    /// Returns `LineCol` of the end of given string
    pub fn end_of_str(inp: &str) -> LineCol {
        let mut lines = inp.split('\n');
        LineCol {
            col: lines.next_back()
                    .map(|ln| ln.chars().count())
                    .unwrap_or(0),
            line: lines.count(),
        }
    }

    /// Lookups byte position for given string
    pub fn to_bytepos(self, inp: &str) -> Option<usize> {
        let ref mut lines = inp.split('\n');

        let (line_bpos, lines_taken) = lines
            .take(self.line)
            .map(|line| line.len() + 1)
            .fold((0, 0), |(len, count), line_len| {
                (len + line_len, count + 1)
            });

        let line = match lines.next() {
            Some(line) => line,
            None => return None
        };

        let (col_bpos, cols_taken) = line
            .char_indices()
            .take(self.col)
            .enumerate()
            .last()
            .map(|(col, (bpos, ch))| (bpos + ch.len_utf8(), col + 1))
            .unwrap_or((0, 0));

        if cols_taken < self.col {
            return None;
        }

        Some(line_bpos + col_bpos)
    }
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn linecol_from_str() {
        assert_eq!(
            LineCol::end_of_str(""),
            LineCol::new(0, 0)
        );

        assert_eq!(
            LineCol::end_of_str("\n"),
            LineCol::new(1, 0)
        );

        assert_eq!(
            LineCol::end_of_str("b\nб"),
            LineCol::new(1, 1)
        );

        assert_eq!(
            LineCol::end_of_str("one\ntwo\nthree"),
            LineCol::new(2, 5)
        );

        assert_eq!(
            LineCol::end_of_str("one\r\ntwo\r\nthree"),
            LineCol::new(2, 5)
        );
    }

    #[test]
    fn linecol_to_bytepos() {
        let text = "abc\r\nбв\nгд";

        assert_eq!(
            &text[LineCol::new(1, 1).to_bytepos(text).unwrap()..],
            "в\nгд"
        );

        assert_eq!(
            &text[LineCol::new(2, 1).to_bytepos(text).unwrap()..],
            "д"
        );
    }

    #[test]
    fn line_out_of_bounds() {
        assert_eq!(
            LineCol::new(3, 0).to_bytepos("б\nв\nг"),
            None
        );
    }

    #[test]
    fn col_out_of_bounds() {
        assert_eq!(
            LineCol::new(0, 2).to_bytepos("б"),
            None
        );
    }
}
