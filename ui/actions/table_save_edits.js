define(function (require, exports, module) {
  'use strict';
  const sql_query = require('../api/sql_query');

  module.exports = () => (dispatch, state) => {
    const { edits, credentials, database } = state;
    const script = modification_script(edits);
    if (!script.length) {
      return;
    }
    
    script.shift({
      statement: 'BEGIN',
    });
    script.push({
      statement: 'END',
    });
    
    sql_query({
      statements: script.map(it => it.statement),
      database,
      credentials,
      describe: true,
    }).then(it => dispatch({
      type: 'TABLE_SAVED',
      edits: it
        .map((stmt_result, i) => [stmt_result, script[i]])
        .filter(([_, { type }]) => type)
        .map(([{ rows: [row], fields }, { type, table_name, key }]) => ({
          type,
          table_name,
          key,
          values: fields.map(({ src_column }, i) => ({ [src_column]: row[i] }))
                        .reduce((a, b) => Object.assign(a, b), {}),
        })).reduce((acc, { table_name, type, key, values }) => {
          const table_edits = acc[table_name] || (acc[table_name] = {
            deletes: {},
            updates: {},
            inserts: [],
          });
          switch (type) {
            case 'insert':
              table_edits.inserts.push(values);
              break;
            case 'update':
              table_edits.updates[key] = values;
              break;
            case 'delete':
              table_edits.deletes[key] = true;
              break;
          }
          return acc;
        }, {}),
    })).catch(err => {
      if (typeof err.stmt_index != 'number') {
        return alert(err.message);
      }
      const { table_name, key } = script[err.stmt_index];
      dispatch({
        type: 'TABLE_SAVE_ERROR',
        table: table_name,
        key,
        message: err.message, 
      });
    });
  };
  
  
  function modification_script(edits) {
    if (!(edits && Object.keys(edits).length)) {
      return [];
    }
    return Object.entries(edits)
      .map(([table_name, edits]) => table_modification_script({ table_name, edits }))
      .reduce((a, b) => a.concat(b));
  }

  function table_modification_script({
    edits: { inserts, updates, deletes },
    table_name
  }) {

    return [
      ...Object.keys(deletes).map(key => ({
        type: 'delete',
        table_name,
        key,
        statement: 
          'DELETE FROM ' + table_name + ' WHERE '
          + JSON.parse(key).map(column_eq_value).join(' AND ')
          + ' RETURNING *'
      })),
      
      ...Object.entries(updates).map(([key, dict]) => ({
        type: 'update',
        table_name,
        key,
        statement:
          'UPDATE ' + table_name + ' SET ' 
          + Object.entries(dict).map(column_eq_value).join(', ')
          + ' WHERE '
          + JSON.parse(key).map(column_eq_value).join(' AND ')
          + ' RETURNING *'
      })),
    
      // FIXME: do Object.keys and Object.values garantee the same order?
      ...inserts.map(dict => ({
        type: 'insert',
        table_name,
        statement:
          'INSERT INTO ' + table_name + '('
          + Object.keys(dict).map(quote_ident).join(', ') 
          + ') VALUES ('
          + Object.values(dict).map(quote_literal).join(', ')
          + ') RETURNING *'
      })),
    ];
  }
  
  function column_eq_value([column, value]) {
    return quote_ident(column) + ' = ' + quote_literal(value);
  }

  function quote_literal(value) {
    return (value === null || typeof value == 'undefined') ?
      'NULL' : '\'' + String(value).replace(/'/g, '\'') + '\'';
  }

  function quote_ident(ident) {
    return '"' + ident.replace(/"/g, '""') + '"';
  }

});
