import sql_query from './sql_query.js';
import database_sql from './treenode_children_sql/database.sql.js';
import schema_or_ext_sql from './treenode_children_sql/schema_or_ext.sql.js';
import rel_sql from './treenode_children_sql/rel.sql.js';

const queries = {
  'database': database_sql,
  'schema': schema_or_ext_sql,
  'extension': schema_or_ext_sql,
  'table': rel_sql,
  'view': rel_sql,
  'matview': rel_sql,
  'foreigntable': rel_sql,
};

export default ({
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
