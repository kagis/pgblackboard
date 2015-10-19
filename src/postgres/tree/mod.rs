pub fn definition_query(dbobj_typ: &str) -> Option<String> {
    let query = match dbobj_typ {
        "database"     => include_str!("def/database.sql"),
        "schema"       => include_str!("def/schema.sql"),
        "extension"    => include_str!("def/ext.sql"),
        "table"        => include_str!("def/rel.sql"),
        "view"         => include_str!("def/rel.sql"),
        "matview"      => include_str!("def/rel.sql"),
        "foreigntable" => include_str!("def/rel.sql"),
        "agg"          => include_str!("def/agg.sql"),
        "func"         => include_str!("def/func.sql"),
        "column"       => include_str!("def/column.sql"),
        "pkcolumn"     => include_str!("def/column.sql"),
        "fkcolumn"     => include_str!("def/column.sql"),
        "index"        => include_str!("def/index.sql"),
        "trigger"      => include_str!("def/trigger.sql"),
        "foreignkey"   => include_str!("def/constraint.sql"),
        "check"        => include_str!("def/constraint.sql"),
        "unique"       => include_str!("def/constraint.sql"),
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

pub fn children_query(dbobj_typ: &str) -> Option<&str> {
    Some(match dbobj_typ {
        "database"     => include_str!("children/database.sql"),
        "schema"       => include_str!("children/schema_ext.sql"),
        "extension"    => include_str!("children/schema_ext.sql"),
        "table"        => include_str!("children/rel.sql"),
        "view"         => include_str!("children/rel.sql"),
        "matview"      => include_str!("children/rel.sql"),
        "foreigntable" => include_str!("children/rel.sql"),
        "agg"          => include_str!("children/dummy.sql"),
        "func"         => include_str!("children/dummy.sql"),
        "column"       => include_str!("children/dummy.sql"),
        "pkcolumn"     => include_str!("children/dummy.sql"),
        "fkcolumn"     => include_str!("children/dummy.sql"),
        "index"        => include_str!("children/dummy.sql"),
        "trigger"      => include_str!("children/dummy.sql"),
        "foreignkey"   => include_str!("children/dummy.sql"),
        "check"        => include_str!("children/dummy.sql"),
        "unique"       => include_str!("children/dummy.sql"),
        _              => return None,
    })
}
