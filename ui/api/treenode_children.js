define(function (require, exports, module) {
  'use strict';
  
  const sql_query = require('./sql_query');
  const queries = {
    'database': require('./treenode_children_sql/database.sql'),
    'schema': require('./treenode_children_sql/schema_or_ext.sql'),
    'extension': require('./treenode_children_sql/schema_or_ext.sql'),
    'table': require('./treenode_children_sql/rel.sql'),
    'view': require('./treenode_children_sql/rel.sql'),
    'matview': require('./treenode_children_sql/rel.sql'),
    'foreigntable': require('./treenode_children_sql/rel.sql'),
  };
  
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
      dbobj_id,
      typ,
      name,
      comment,
      can_have_children,
      group
    ]) => ({
      treenode_id: [database, typ, dbobj_id],
      database,
      typ,
      name,
      comment,
      can_have_children: can_have_children == 't',
      group,
    })));
});
