pub fn children_query(dbobj_typ: &str) -> Option<&str> {
    Some(match dbobj_typ {
        "database"     => include_str!("children_of_database.sql"),
        "schema"       => include_str!("children_of_schema_or_ext.sql"),
        "extension"    => include_str!("children_of_schema_or_ext.sql"),
        "table"        => include_str!("children_of_rel.sql"),
        "view"         => include_str!("children_of_rel.sql"),
        "matview"      => include_str!("children_of_rel.sql"),
        "foreigntable" => include_str!("children_of_rel.sql"),
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
