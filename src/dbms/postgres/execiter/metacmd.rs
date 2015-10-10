pub fn extract_connect_metacmd(sqlscript: &str) -> Option<SqlScriptAndDbName> {
    let pat = regex!(r"(?ms)^\s*\\c(?:onnect)?[ \t]+(\w+)[ \t]*[\r\n]+(.*)");
    pat.captures(sqlscript).map(|captures| SqlScriptAndDbName {
        database: captures.at(1).unwrap().to_string(),
        database_pos: captures.pos(1).unwrap().0,
        sqlscript: captures.at(2).unwrap(),
        sqlscript_pos: captures.pos(2).unwrap().0
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

#[cfg(test)]
mod tests {
    use super::{ extract_connect_metacmd, SqlScriptAndDbName };

    #[test]
    fn extract_connect_to_postgres() {

        let result = extract_connect_metacmd(
            "\\connect postgres\nselect 'awesome'"
        );

        assert_eq!(result, Some(SqlScriptAndDbName {
            database: "postgres".to_string(),
            database_pos: 9,
            sqlscript: "select 'awesome'",
            sqlscript_pos: 18
        }));
    }

    #[test]
    fn extract_connect_to_db_with_quotes() {

        let result = extract_connect_metacmd(
            "\\connect \"weird \"\"db\"\"\"\nselect 'awesome'"
        );

        assert_eq!(result, Some(SqlScriptAndDbName {
            database: "weird\"db\"".to_string(),
            database_pos: 9,
            sqlscript: "select 'awesome'",
            sqlscript_pos: 24
        }));
    }
}
