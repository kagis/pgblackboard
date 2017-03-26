define(function (require, exports, module) {
  'use strict';

  module.exports = modification_script;

  function modification_script(items) {
    if (!(items && items.length)) {
      return null;
    }
    return items
      .filter(({ changes }) => Object.keys(changes).length)
      .map(it => table_modification_script(it))
      .reduce((a, b) => a.concat(b));
  }

  function table_modification_script({
    rows,
    changes,
    source_table: { schema_name, table_name, columns },
  }) {

    const full_table_name = quote_ident(schema_name) + '.' + quote_ident(table_name);

    const inserting_rows =
      Object.keys(changes)
        .filter(row_index => !(row_index in rows))
        .map(row_index => changes[row_index])

    const updating_rows_indexes =
      Object.keys(changes)
        .filter(row_index => row_index in rows && changes[row_index] != 'delete')

    const deleting_rows =
      Object.keys(changes)
        .filter(row_index => row_index in rows && changes[row_index] == 'delete')
        .map(row_index => rows[row_index])

    let script = [];

    if (deleting_rows.length) {
      const key_columns = columns.filter(col => col.is_key)
      script.push(
        'DELETE FROM ' + full_table_name +
        ' WHERE (' + key_columns.map(col => col.name).map(quote_ident).join(', ') +
        ') IN (' +
        deleting_rows.map(row => '(' +
          key_columns.map(col => row[col.field_index])
                    .map(quote_literal)
                    .join(', ') +
          ')')
        .join(', ') + ')'
      );
    }

    if (inserting_rows.length) {
      script.push(
        'INSERT INTO ' + full_table_name +

        '\n(' + columns.map(col => col.name).map(quote_ident).join(', ') + ')' +
        ' VALUES \n' + inserting_rows.map(
          inserting_row => '(' + columns
            .map(col => inserting_row[col.field_index])
            .map(quote_literal)
            .join(', ') + ')'
        ).join(',\n') + ';'
      );
    }

    if (updating_rows_indexes.length) {
      script = script.concat(
        updating_rows_indexes.map(function (updating_row_index) {
          const new_values = changes[updating_row_index]
          const old_values = rows[updating_row_index]
          return 'UPDATE ' + full_table_name +
            ' SET ' +
            columns
              .filter(col => new_values[col.field_index] != old_values[col.field_index])
              .map(col => quote_ident(col.name) + ' = ' + quote_literal(new_values[col.field_index]))
              .join(', ') +
            ' WHERE ' +
            columns
              .filter(col => col.is_key)
              .map(col => quote_ident(col.name) + ' = ' + quote_literal(old_values[col.field_index]))
              .join(' AND ')
        })
      );
    }

    return script
  }

  function quote_literal(value) {
    return (value === null || typeof value == 'undefined') ?
      'NULL' : '\'' + String(value).replace(/'/g, '\'') + '\'';
  }

  function quote_ident(ident) {
    return '"' + ident.replace(/"/g, '""') + '"'
  }
})
