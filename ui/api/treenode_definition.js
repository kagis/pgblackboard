define(function (require, exports, module) {
  'use strict';
  const sql_query = require('./sql_query');
  const queries = {
    'database': require('./treenode_definition_sql/database.sql'),
    'schema': require('./treenode_definition_sql/schema.sql'),
    'extension': require('./treenode_definition_sql/extension.sql'),
    'table': require('./treenode_definition_sql/rel.sql'),
    'view': require('./treenode_definition_sql/rel.sql'),
    'matview': require('./treenode_definition_sql/rel.sql'),
    'foreigntable': require('./treenode_definition_sql/rel.sql'),
    'agg': require('./treenode_definition_sql/agg.sql'),
    'func': require('./treenode_definition_sql/func.sql'),
    'column': require('./treenode_definition_sql/column.sql'),
    'pkcolumn': require('./treenode_definition_sql/column.sql'),
    'fkcolumn': require('./treenode_definition_sql/column.sql'),
    'index': require('./treenode_definition_sql/index.sql'),
    'trigger': require('./treenode_definition_sql/trigger.sql'),
    'foreignkey': require('./treenode_definition_sql/constraint.sql'),
    'check': require('./treenode_definition_sql/constraint.sql'),
    'unique': require('./treenode_definition_sql/constraint.sql'),
  };
  
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

});
