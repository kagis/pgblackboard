use std::iter::Iterator;

pub fn extract_connect_metacmd(sqlscript: &str) -> Option<SqlScriptAndDbName> {

    fn eat_database_name(src: &str) -> Option<(&str, &str)> {
        let tail = eat_while(src, |ch| ch.is_alphanumeric() || ch == '_');
        if tail.len() != src.len() {
            return Some((
                &src[..src.len() - tail.len()],
                tail,
            ));
        }

        let mut tail = src;
        while let Some(new_tail) = eat_ident(tail) {
            tail = new_tail;
        }

        if tail.len() != src.len() {
            return Some((
                &src[..src.len() - tail.len()],
                tail,
            ));
        }

        None
    }

    fn unquote_ident(mut quoted: &str) -> String {
        if quoted.starts_with("\"") {
            quoted = &quoted[1..];
        }
        if quoted.ends_with("\"") {
            quoted = &quoted[..quoted.len() - 1];
        }
        quoted.replace("\"\"", "\"")
    }

    fn eat_whitespaces_except_lf(src: &str) -> &str {
        eat_while(src, |ch| ch != '\n' && ch.is_whitespace())
    }

    fn eat_whitespaces_except_crlf_required(src: &str) -> Option<&str> {
        let tail = eat_while(src, |ch| ch != '\n' &&
                                       ch != '\r' &&
                                       ch.is_whitespace());

        if tail.len() == src.len() { None } else { Some(tail) }
    }

    Some(eat_whitespaces(sqlscript))
        .and_then(|tail| eat_exact(tail, "\\connect")
                     .or(eat_exact(tail, "\\c")))
        .and_then(|tail| eat_whitespaces_except_crlf_required(tail))
        .and_then(|tail| eat_database_name(tail).map(|(db, tail_)| (db, sqlscript.len() - tail.len(), tail_)))
        .and_then(|(db, db_pos, tail)| Some((db, db_pos, eat_whitespaces_except_lf(tail))))
        .and_then(|(db, db_pos, tail)| eat_exact(tail, "\n").map(|tail| (db, db_pos, tail)))
        .map(|(db, db_pos, tail)| SqlScriptAndDbName {
            database: unquote_ident(db),
            database_pos: db_pos,
            sqlscript: tail,
            sqlscript_pos: sqlscript.len() - tail.len(),
        })
}

#[derive(Debug)]
#[derive(PartialEq)]
pub struct SqlScriptAndDbName<'a> {
    pub database: String,
    pub database_pos: usize,
    pub sqlscript: &'a str,
    pub sqlscript_pos: usize,
}

pub fn trimstart_comments(statement: &str) -> &str {
    let mut tail = eat_whitespaces(statement);
    while let Some(new_tail) = eat_line_comment(tail)
                   .or_else(|| eat_block_comment(tail))
    {
        tail = eat_whitespaces(new_tail);
    }
    tail
}


pub fn split_statements<'a>(script: &'a str) -> SplitStatements<'a> {
    SplitStatements { script: script }
}

pub struct SplitStatements<'a> {
    script: &'a str
}

impl<'a> Iterator for SplitStatements<'a> {
    type Item = &'a str;

    fn next(&mut self) -> Option<&'a str> {
        if self.script.is_empty() {
            None
        } else {
            let (stmt, tail) = next_statement(self.script);
            self.script = tail;
            Some(stmt)
        }
    }
}

fn next_statement(script: &str) -> (&str, &str) {
    let mut tail = script;

    while !tail.is_empty() {

        if let Some(next_tail) = eat_exact(tail, ";") {
            tail = next_tail;
            break;
        }

        tail = None
            .or_else(|| eat_line_comment(tail))
            .or_else(|| eat_block_comment(tail))
            .or_else(|| eat_ident(tail))
            .or_else(|| eat_literal(tail))
            .or_else(|| eat_extended_literal(tail))
            .or_else(|| eat_dollar_quoted_literal(tail))
            .or_else(|| eat_next_char(tail))
            .unwrap_or("");
    }

    (&script[..script.len() - tail.len()], tail)
}

fn eat_next_char(src: &str) -> Option<&str> {
    slice_shift_char(src).map(|(_, tail)| tail)
}

fn eat_block_comment(src: &str) -> Option<&str> {
    eat_openclose(src, "/*", "*/")
}

fn eat_line_comment(src: &str) -> Option<&str> {
    eat_openclose(src, "--", "\n")
}

fn eat_literal(src: &str) -> Option<&str> {
    eat_openclose(src, "'", "'")
}

fn eat_extended_literal(src: &str) -> Option<&str> {
    eat_openclose_escaped(src, "e'", "'", '\\')
        .or_else(|| eat_openclose_escaped(src, "E'", "'", '\\'))
}

fn eat_ident(src: &str) -> Option<&str> {
    eat_openclose(src, "\"", "\"")
}

fn eat_dollar_quoted_literal(src: &str) -> Option<&str> {
    if let Some((dollar_quote, tail)) = eat_dollar_quote(src) {
        Some(eat_until(tail, dollar_quote))
    } else {
        None
    }
}

fn eat_dollar_quote(src: &str) -> Option<(&str, &str)> {
    if let Some(dollar_tag_start) = eat_exact(src, "$") {
        let dollar_tag_end = eat_while(
            dollar_tag_start,
            |ch| ch.is_alphanumeric() || ch == '_'
        );
        if let Some(out_of_dollar_quote) = eat_exact(dollar_tag_end, "$") {
            let dollar_quote = &src[..src.len() - out_of_dollar_quote.len()];
            return Some((dollar_quote, out_of_dollar_quote));
        }
    }
    None
}

fn eat_whitespaces(src: &str) -> &str {
    eat_while(src, |ch| ch.is_whitespace())
}

fn eat_while<F>(src: &str, f: F) -> &str where F: Fn(char) -> bool {
    let mut tail = src;
    while let Some(n) = slice_shift_char(tail)
            .and_then(|(ch, tail)| if f(ch) { Some(tail) } else { None })
    {
        tail = n;
    }
    tail
}

fn eat_openclose<'a, 'b, 'c>(src: &'a str,
                             open: &'b str,
                             close: &'c str)
                             -> Option<&'a str>
{
    if let Some(in_block) = eat_exact(src, open) {
        Some(eat_until(in_block, close))
    } else {
        None
    }
}

fn eat_openclose_escaped<'a, 'b, 'c>(src: &'a str,
                                     open: &'b str,
                                     close: &'c str,
                                     escape_ch: char)
                                     -> Option<&'a str>
{
    if let Some(in_block) = eat_exact(src, open) {
        Some(eat_until_escaped(in_block, close, escape_ch))
    } else {
        None
    }
}

fn eat_exact<'a, 'b>(src: &'a str, token: &'b str) -> Option<&'a str> {
    if src.starts_with(token) {
        Some(&src[token.len()..])
    } else {
        None
    }
}

fn eat_until<'a, 'b>(src: &'a str, close_token: &'b str) -> &'a str {
    let mut tail = src;
    loop {
        if let Some(tail) = eat_exact(tail, close_token) {
            return tail;
        }

        if let Some(next_tail) = eat_next_char(tail) {
            tail = next_tail;
        } else {
            return "";
        }
    }
}

fn eat_until_escaped<'a, 'b>(src: &'a str,
                             close_token: &'b str,
                             escape_ch: char)
                             -> &'a str
{
    let mut tail = src;
    loop {
        if let Some(out_of_block) = eat_exact(tail, close_token) {
            return out_of_block;
        }

        if let Some((ch, next_tail)) = slice_shift_char(tail) {
            tail = if ch == escape_ch {
                slice_shift_char(next_tail)
                         .map(|(_, it)| it)
                         .unwrap_or(next_tail)
            } else {
                next_tail
            };
        } else {
            return "";
        }
    }
}

fn slice_shift_char(src: &str) -> Option<(char, &str)> {
    src.chars().next().map(|ch| (ch, &src[ch.len_utf8()..]))
}

#[cfg(test)]
mod test {
    use super::next_statement;
    use super::trimstart_comments;
    use super::{ extract_connect_metacmd, SqlScriptAndDbName };

    #[test]
    fn trimstart_comments_block() {
        assert_eq!(
            trimstart_comments("/*comment*/select"),
            "select"
        );
    }

    #[test]
    fn trimstart_comments_line() {
        assert_eq!(
            trimstart_comments("--comment\nselect"),
            "select"
        );
    }

    #[test]
    fn trimstart_comments_whitespaces() {
        assert_eq!(
            trimstart_comments(" \t\nselect"),
            "select"
        );
    }

    #[test]
    fn trimstart_comments_all() {
        assert_eq!(
            trimstart_comments(" /*comment*/ \n--comment\n select"),
            "select"
        );
    }

    fn assert_no_split(script: &str) {
        assert_eq!(next_statement(script), (script, ""));
    }

    #[test]
    fn split() {
        assert_eq!(
            next_statement("SELECT 1;SELECT 2;"),
            ("SELECT 1;", "SELECT 2;")
        );
    }

    // fn split_with_missing_last_semicolon() {
    //     assert_eq!(
    //         next_statement("SELECT 1;SELECT 2"),
    //         ['SELECT 1;', 'SELECT 2']
    //     )
    // }

    #[test]
    fn split_fake_dollar_tag() {
        // make sure that $1, $ is not interpret as dollar tag
        assert_eq!(
            next_statement("SELECT $1, $2; SELECT $1, $2;"),
            ("SELECT $1, $2;", " SELECT $1, $2;")
        )
    }

    #[test]
    fn ignore_semicolon_in_literal() {
        assert_no_split(r#"SELECT ';', ..."#)
    }

    #[test]
    fn ignore_semicolon_in_extended_literal() {
        assert_no_split(r#"SELECT e'\';\'', ..."#);
        assert_no_split(r#"SELECT E'\';\'', ..."#);
    }

    #[test]
    fn ignore_semicolon_in_ident() {
        assert_no_split(r#"SELECT 1 AS ";", ..."#);
    }

    #[test]
    fn ignore_semicolon_in_dollar_str() {
        assert_no_split(r#"SELECT 1 AS $$;$$, ..."#);
    }

    #[test]
    fn ignore_semicolon_in_dollar_str_with_named_tag() {
        assert_no_split(r#"SELECT 1 AS $foo_1$;$foo_1$, ..."#);
    }

    #[test]
    fn ignore_semicolon_in_dollar_str_nested() {
        assert_no_split(r#"SELECT 1 AS $foo_1$ $bar; $foo_1$"#);
    }

    #[test]
    fn ignore_semicolon_in_block_comment() {
        assert_no_split(r#"SELECT 1/*;*/, ..."#);
    }

    #[test]
    fn ignore_semicolon_in_line_comment() {
        assert_no_split(r#"SELECT 1 -- one;\n, ..."#);
    }


    #[test]
    fn extract_connect_to_postgres() {
        assert_eq!(
            extract_connect_metacmd(
                "\\connect postgres\nselect 'awesome'"
            ),
            Some(SqlScriptAndDbName {
                database: "postgres".to_string(),
                database_pos: 9,
                sqlscript: "select 'awesome'",
                sqlscript_pos: 18
            })
        );
    }

    #[test]
    fn extract_connect_to_db_with_quotes() {
        assert_eq!(
            extract_connect_metacmd(
                "\\connect \"weird \"\"db\"\"\"\nselect 'awesome'"
            ),
            Some(SqlScriptAndDbName {
                database: "weird \"db\"".to_string(),
                database_pos: 9,
                sqlscript: "select 'awesome'",
                sqlscript_pos: 24
            })
        );
    }

    #[test]
    fn fail_extract_connect_when_missing_sep() {
        assert_eq!(
            extract_connect_metacmd(
                "\\connect_db\nselect 'awesome'"
            ),
            None
        );
    }
}
