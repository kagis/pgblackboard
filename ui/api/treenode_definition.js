import sql_query from './sql_query.js';
import database_sql from './treenode_definition_sql/database.sql.js';
import schema_sql from './treenode_definition_sql/schema.sql.js';
import extension_sql from './treenode_definition_sql/extension.sql.js';
import rel_sql from './treenode_definition_sql/rel.sql.js';
import agg_sql from './treenode_definition_sql/agg.sql.js';
import func_sql from './treenode_definition_sql/func.sql.js';
import column_sql from './treenode_definition_sql/column.sql.js';
import index_sql from './treenode_definition_sql/index.sql.js';
import trigger_sql from './treenode_definition_sql/trigger.sql.js';
import constraint_sql from './treenode_definition_sql/constraint.sql.js';

const queries = {
  'database': database_sql,
  'schema': schema_sql,
  'extension': extension_sql,
  'table': rel_sql,
  'view': rel_sql,
  'matview': rel_sql,
  'foreigntable': rel_sql,
  'agg': agg_sql,
  'func': func_sql,
  'column': column_sql,
  'pkcolumn': column_sql,
  'fkcolumn': column_sql,
  'index': index_sql,
  'trigger': trigger_sql,
  'foreignkey': constraint_sql,
  'check': constraint_sql,
  'unique': constraint_sql,
};

export default ({
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

