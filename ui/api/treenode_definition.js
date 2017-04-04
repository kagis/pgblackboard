define(function (require, exports, module) {
  'use strict';
  const sql_query = require('./sql_query');
  
  module.exports = ({
    treenode_id: [database, dbobj_type, dbobj_id],
    credentials
  }) => sql_query({
    statements: [get_query(dbobj_id, dbobj_type)],
    database,
    credentials,
  }).then(([{ rows: [[def]] }]) => def);
  
  const get_query = (dbobj_id, dbobj_type) => `
    SELECT '\\connect '::text \
      || quote_ident(current_database()) \
      || '\r\n\r\n'::text \
      || def::text \
    FROM (${queries[dbobj_type]}) AS a
  `.replace(/\$1/g, `'${dbobj_id}'`)
    .replace(/\$2/g, `'${dbobj_type}'`);
    
  const queries = {};
  
  queries['database'] = loadfile('./treenode_definition_sql/database.sql');
  queries['schema'] = loadfile('./treenode_definition_sql/schema.sql');
  queries['extension'] = loadfile('./treenode_definition_sql/extension.sql');
  
  queries['table'] =
  queries['view'] = 
  queries['matview'] =
  queries['foreigntable'] = loadfile('./treenode_definition_sql/rel.sql');
  
  queries['agg'] = loadfile('./treenode_definition_sql/agg.sql');
  queries['func'] = loadfile('./treenode_definition_sql/func.sql');
  
  queries['column'] =
  queries['pkcolumn'] =
  queries['fkcolumn'] = loadfile('./treenode_definition_sql/column.sql');
  
  queries['index'] = loadfile('./treenode_definition_sql/index.sql');
  queries['trigger'] = loadfile('./treenode_definition_sql/trigger.sql');
  
  queries['foreignkey'] = 
  queries['check'] = 
  queries['unique'] = loadfile('./treenode_definition_sql/constraint.sql');

});
