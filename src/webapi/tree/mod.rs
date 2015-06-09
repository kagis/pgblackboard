// use super::postgres;
// use std::old_io::IoResult;
// use std::old_io::Stream;

// pub struct NodeService<T: Stream> {
//     pub dbconn: postgres::Connection<T>,
//     pub nodeid: String,
//     pub nodetype: String,
// }



// #[derive(Decodable, Encodable)]
// pub struct Node {
//     database: String,
//     id: String,
//     typ: String,
//     name: String,
//     comment: Option<String>,
//     has_children: bool,
// }

// pub enum DbObjType {
//     Database,
//     Schema,
//     Extension,
//     Table,
//     View,
//     MaterializedView,
//     ForeignTable,
//     AggregateFunction,
//     Function,
//     Column,
//     PrimaryKeyColumn,
//     ForeignKeyColumn,
//     Index,
//     Trigger,
//     ForeignKeyConstraint,
//     CheckConstraint,
//     UniqueConstraint,
// }

// impl DbObjType {
//     pub fn from_str(inp: &str) -> Option<DbObjType> {
//         Ok(match inp {
//             "database" => DbObjType::Database,
//             "schema" => DbObjType::Schema,
//             "extension" => DbObjType::Extension,
//             "table" => DbObjType::Table,
//             "view" => DbObjType::View,
//             "matview" => DbObjType::MaterializedView,
//             "foreigntable" => DbObjType::ForeignTable,
//             "agg" => DbObjType::AggregateFunction,
//             "func" => DbObjType::Function,
//             "column" => DbObjType::Column,
//             "pkcolumn" => DbObjType::PrimaryKeyColumn,
//             "fkcolumn" => DbObjType::ForeignKeyColumn,
//             "index" => DbObjType::Index,
//             "trigger" => DbObjType::Trigger,
//             "foreignkey" => DbObjType::ForeignKeyConstraint,
//             "check" => DbObjType::CheckConstraint,
//             "unique" => DbObjType::UniqueConstraint,
//             _ => return None
//         })
//     }
// }


// impl<T: Stream> NodeService<T> {

//     pub fn get_children(&mut self) -> IoResult<Vec<Node>> {
//         let query = match &self.nodetype {
//             "database"     => include_str!("children/database.sql"),
//             "schema"       => include_str!("children/schema_ext.sql"),
//             "extension"    => include_str!("children/schema_ext.sql"),
//             "table"        => include_str!("children/rel.sql"),
//             "view"         => include_str!("children/rel.sql"),
//             "matview"      => include_str!("children/rel.sql"),
//             "foreigntable" => include_str!("children/rel.sql"),
//             _ => return Ok(vec![]),
//         };

//         let query = query.replace("%(nodeid)s", &quote_literal(&self.nodeid))
//                          .replace("%(nodetype)s", &quote_literal(&self.nodetype));
//         //let query = query.replace()
//         self.dbconn.query(&query)
//         //let
//     }

//     pub fn get_definition(&mut self) -> IoResult<String> {
//         let query = match &self.nodetype {
//             "database"     => include_str!("def/database.sql"),
//             "schema"       => include_str!("def/schema.sql"),
//             "extension"    => include_str!("def/ext.sql"),
//             "table"        => include_str!("def/rel.sql"),
//             "view"         => include_str!("def/rel.sql"),
//             "matview"      => include_str!("def/rel.sql"),
//             "foreigntable" => include_str!("def/rel.sql"),
//             "agg"          => include_str!("def/agg.sql"),
//             "func"         => include_str!("def/func.sql"),
//             "column"       => include_str!("def/column.sql"),
//             "pkcolumn"     => include_str!("def/column.sql"),
//             "fkcolumn"     => include_str!("def/column.sql"),
//             "index"        => include_str!("def/index.sql"),
//             "trigger"      => include_str!("def/trigger.sql"),
//             "foreignkey"   => include_str!("def/constraint.sql"),
//             "check"        => include_str!("def/constraint.sql"),
//             "unique"       => include_str!("def/constraint.sql"),
//             _ => return Ok("No".to_string())
//         };

//         let query = query.replace("%(nodeid)s", &quote_literal(&self.nodeid))
//                          .replace("%(nodetype)s", &quote_literal(&self.nodetype));

//         #[derive(Decodable)]
//         struct Definition {
//             def: String,
//         }

//         let mut result = self.dbconn.query::<Definition>(&query).unwrap();

//         Ok(result.pop().unwrap().def)

//     }
// }

// fn quote_literal(s: &str) -> String {
//     ["'", &s.replace("'", "''"), "'"].concat()
// }

// /*
// _NODEMAP = (
//       #node type      #children query            #definition query
//      ('database'     ,'children/database.sql'   ,'def/database.sql'   )
//     ,('schema'       ,'children/schema_ext.sql' ,'def/schema.sql'     )
//     ,('extension'    ,'children/schema_ext.sql' ,'def/ext.sql'        )
//     ,('table'        ,'children/rel.sql'        ,'def/rel.sql'        )
//     ,('view'         ,'children/rel.sql'        ,'def/rel.sql'        )
//     ,('matview'      ,'children/rel.sql'        ,'def/rel.sql'        )
//     ,('foreigntable' ,'children/rel.sql'        ,'def/rel.sql'        )
//     ,('agg'          ,None                      ,'def/agg.sql'        )
//     ,('func'         ,None                      ,'def/func.sql'       )
//     ,('column'       ,None                      ,'def/column.sql'     )
//     ,('pkcolumn'     ,None                      ,'def/column.sql'     )
//     ,('fkcolumn'     ,None                      ,'def/column.sql'     )
//     ,('index'        ,None                      ,'def/index.sql'      )
//     ,('trigger'      ,None                      ,'def/trigger.sql'    )
//     ,('foreignkey'   ,None                      ,'def/constraint.sql' )
//     ,('check'        ,None                      ,'def/constraint.sql' )
//     ,('unique'       ,None                      ,'def/constraint.sql' )
// )
// */

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

fn main() {
    // Add code here
}
