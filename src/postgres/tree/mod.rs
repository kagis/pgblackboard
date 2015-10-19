macro_rules! dbobjtype_map {
    ( $(( $enumvar:ident, $strid:expr, $children_file:expr, $def_file:expr)),* ) => {

        #[derive(Copy, Clone)]
        #[derive(Debug)]
        #[derive(PartialEq)]
        pub enum DbObjType {
            $($enumvar,)*
        }

        impl DbObjType {
            pub fn from_str(inp: &str) -> Option<DbObjType> {
                Some(match inp {
                    $($strid => DbObjType::$enumvar,)*
                    _ => return None
                })
            }

            pub fn to_str(self) -> &'static str {
                match self {
                    $(DbObjType::$enumvar => $strid,)*
                }
            }

            pub fn children_query(self) -> &'static str {
                match self {
                    $(DbObjType::$enumvar => {
                        include_str!(concat!("children/", $children_file))
                    })*
                }
            }

            pub fn definition_query(self) -> &'static str {
                match self {
                    $(DbObjType::$enumvar => {
                        include_str!(concat!("def/", $def_file))
                    })*
                }
            }
        }

    }
}

dbobjtype_map! {
     (Database             ,"database"     ,"database.sql"   ,"database.sql"   )
    ,(Schema               ,"schema"       ,"schema_ext.sql" ,"schema.sql"     )
    ,(Extension            ,"extension"    ,"schema_ext.sql" ,"ext.sql"        )
    ,(Table                ,"table"        ,"rel.sql"        ,"rel.sql"        )
    ,(View                 ,"view"         ,"rel.sql"        ,"rel.sql"        )
    ,(MaterializedView     ,"matview"      ,"rel.sql"        ,"rel.sql"        )
    ,(ForeignTable         ,"foreigntable" ,"rel.sql"        ,"rel.sql"        )
    ,(AggregateFunction    ,"agg"          ,"dummy.sql"      ,"agg.sql"        )
    ,(Function             ,"func"         ,"dummy.sql"      ,"func.sql"       )
    ,(Column               ,"column"       ,"dummy.sql"      ,"column.sql"     )
    ,(PrimaryKeyColumn     ,"pkcolumn"     ,"dummy.sql"      ,"column.sql"     )
    ,(ForeignKeyColumn     ,"fkcolumn"     ,"dummy.sql"      ,"column.sql"     )
    ,(Index                ,"index"        ,"dummy.sql"      ,"index.sql"      )
    ,(Trigger              ,"trigger"      ,"dummy.sql"      ,"trigger.sql"    )
    ,(ForeignKeyConstraint ,"foreignkey"   ,"dummy.sql"      ,"constraint.sql" )
    ,(CheckConstraint      ,"check"        ,"dummy.sql"      ,"constraint.sql" )
    ,(UniqueConstraint     ,"unique"       ,"dummy.sql"      ,"constraint.sql" )
}

