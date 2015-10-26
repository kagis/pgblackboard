pub fn children_query(dbobj_typ: &str) -> Option<&str> {
    Some(match dbobj_typ {
        "database"     => include_str!("database.sql"),
        "schema"       => include_str!("schema_ext.sql"),
        "extension"    => include_str!("schema_ext.sql"),
        "table"        => include_str!("rel.sql"),
        "view"         => include_str!("rel.sql"),
        "matview"      => include_str!("rel.sql"),
        "foreigntable" => include_str!("rel.sql"),
        "agg"          => include_str!("dummy.sql"),
        "func"         => include_str!("dummy.sql"),
        "column"       => include_str!("dummy.sql"),
        "pkcolumn"     => include_str!("dummy.sql"),
        "fkcolumn"     => include_str!("dummy.sql"),
        "index"        => include_str!("dummy.sql"),
        "trigger"      => include_str!("dummy.sql"),
        "foreignkey"   => include_str!("dummy.sql"),
        "check"        => include_str!("dummy.sql"),
        "unique"       => include_str!("dummy.sql"),
        _              => return None,
    })
}
