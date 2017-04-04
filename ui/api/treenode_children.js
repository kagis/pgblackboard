define(function (require, exports, module) {
  'use strict';
  
  const sql_query = require('./sql_query');
  
  module.exports = ({
    treenode_id: [database, dbobj_type, dbobj_id],
    credentials
  }) => sql_query({
      statements: [
        queries[dbobj_type]
          .replace(/\$1/g, `'${dbobj_id}'`)
          .replace(/\$2/g, `'${dbobj_type}'`),
      ],
      credentials,
      database,
    }).then(([{ rows }]) => rows.map(([
      database,
      id,
      typ,
      name,
      comment,
      can_have_children,
      group
    ]) => ({
      path: [database, typ, id],
      database,
      typ,
      name,
      comment,
      can_have_children: can_have_children == 't',
      group,
    })));
    
  const queries = {};
  
  queries['database'] = loadfile('./treenode_children_sql/database.sql');
  
  queries['schema'] =
  queries['extension'] = loadfile('./treenode_children_sql/schema_or_ext.sql');
  
  queries['table'] =
  queries['view'] = 
  queries['matview'] = 
  queries['foreigntable'] = loadfile('./treenode_children_sql/rel.sql');
})