define(function (require, exports, module) {
  'use strict';
  const sql_query = require('../api/sql_query');

  module.exports = () => (dispatch, state) => {
    const { edits, credentials } = state;
    const script = modification_script(edits);
    if (!script.length) {
      return;
    }

    const database = script[0].database;

    script.unshift({
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
        .map(([{ rows: [row], fields }, { type, database_and_table, key }]) => ({
          type,
          database_and_table,
          key,
          values: fields.map(({ src_column }, i) => ({ [src_column]: row[i] }))
                        .reduce((a, b) => Object.assign(a, b), {}),
        })).reduce((acc, { database_and_table, type, key, values }) => {
          const table_edits = acc[database_and_table] || (acc[database_and_table] = {
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
      const { database_and_table, key, type, insert_index } = script[err.stmt_index];
      dispatch({
        type: 'TABLE_SAVE_ERROR',
        database_and_table,
        key,
        insert_index,
        edit_type: type,
        message: err.message,
      });
    });
  };


  function modification_script(edits) {
    if (!(edits && Object.keys(edits).length)) {
      return [];
    }
    return Object.entries(edits)
      .map(([database_and_table, edits]) => table_modification_script({
        database_and_table,
        edits,
      }))
      .reduce((a, b) => a.concat(b));
  }

  function table_modification_script({
    edits: { inserts, updates, deletes },
    database_and_table
  }) {
    const [database, table] = JSON.parse(database_and_table);
    return [
      ...Object.keys(deletes).map(key => ({
        type: 'delete',
        database,
        database_and_table,
        key,
        statement:
          'DELETE FROM ' + table + ' WHERE '
          + JSON.parse(key).map(column_eq_value).join(' AND ')
          + ' RETURNING *'
      })),

      ...Object.entries(updates).map(([key, dict]) => ({
        type: 'update',
        database,
        database_and_table,
        key,
        statement:
          'UPDATE ' + table + ' SET '
          + Object.entries(dict).map(column_eq_value).join(', ')
          + ' WHERE '
          + JSON.parse(key).map(column_eq_value).join(' AND ')
          + ' RETURNING *'
      })),

      // FIXME: do Object.keys and Object.values garantee the same order?
      ...inserts.map((dict, insert_index) => ({
        type: 'insert',
        database,
        database_and_table,
        insert_index,
        statement:
          'INSERT INTO ' + table + '('
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
