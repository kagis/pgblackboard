pub fn definition_query(dbobj_typ: &str) -> Option<String> {
    let query = match dbobj_typ {
        "database"     => include_str!("database.sql"),
        "schema"       => include_str!("schema.sql"),
        "extension"    => include_str!("ext.sql"),
        "table"        => include_str!("rel.sql"),
        "view"         => include_str!("rel.sql"),
        "matview"      => include_str!("rel.sql"),
        "foreigntable" => include_str!("rel.sql"),
        "agg"          => include_str!("agg.sql"),
        "func"         => include_str!("func.sql"),
        "column"       => include_str!("column.sql"),
        "pkcolumn"     => include_str!("column.sql"),
        "fkcolumn"     => include_str!("column.sql"),
        "index"        => include_str!("index.sql"),
        "trigger"      => include_str!("trigger.sql"),
        "foreignkey"   => include_str!("constraint.sql"),
        "check"        => include_str!("constraint.sql"),
        "unique"       => include_str!("constraint.sql"),
        _              => return None,
    };

    Some(format!(
       "SELECT '\\connect '::text \
            || quote_ident(current_database()) \
            || '\r\n\r\n'::text \
            || def::text \
          FROM ({}) AS a",
       query
   ))
}
