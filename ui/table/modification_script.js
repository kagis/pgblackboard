define(function (require, exports, module) {
  'use strict';

  module.exports = modification_script;

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
    return '"' + ident.replace(/"/g, '""') + '"'
  }
})
