define(function (require, exports, module) {
  'use strict';

  module.exports = modificationScript;

  function modificationScript({ items }) {
    if (items && items.length) {
      const script = items
        .filter(it => it.resultType == 'ROWSET')
        .filter(rowset => Object.keys(rowset.dirtyRows).length)
        .map(rowset => tableModificationScript(Object.assign({
          tableName: 'public.tab', // rowset.fields.map(f => f.src_column).filter(Boolean).map(col => col.table_path.join('.'))[0],
        }, rowset)))
        .join('\n\n')

      return script && '\\connect postgres\n\nBEGIN;\n\n' + script + '\n\nCOMMIT;\n';
    }
  }

  function tableModificationScript({ rows, dirtyRows, fields, tableName }) {
    return Object.keys(dirtyRows)
      .map(rowIndex => rowIndex in rows ?
        rowUpdateStatement({
          oldValues: rows[rowIndex],
          newValues: dirtyRows[rowIndex],
          fields,
          tableName,
        }) :
        rowInsertStatement({
          values: dirtyRows[rowIndex],
          fields,
          tableName,
        })
      )
      .join('\n');
  }

  function rowUpdateStatement({ oldValues, newValues, fields, tableName }) {
    return 'UPDATE ' +
      tableName +

      '\n   SET ' +
      fields.map((field, fieldIndex) => [
          field.src_column,
          newValues[fieldIndex],
          oldValues[fieldIndex],
        ])
        .filter(([col]) => col)
        .filter(([, newVal, oldVal]) => newVal != oldVal)
        .map(([col, val]) => colEqVal(col.name, val))
        .join(',\n       ') +

      '\n WHERE ' +
      fields.map((field, fieldIndex) => [field.src_column, oldValues[fieldIndex]])
        .filter(([col]) => col && col.is_key)
        .map(([col, val]) => colEqVal(col.name, val))
        .join(' AND\n') +

       '\nRETURNING *;\n'

    function colEqVal(columnName, value) {
      return columnName + ' = \'' + value + '\'';
    }
  }

  function rowInsertStatement({ values, fields, tableName }) {
    const columnNames = fields
      .map(f => f.src_column)
      .filter(Boolean)
      .map(col => col.name)
      .join(', ')

    const insertingValues = fields
      .map((f, fieldIndex) => [f.src_column, values[fieldIndex]])
      .filter(([col]) => Boolean(col))
      .map(([, val]) => quoteLiteral(val))

    return 'INSERT INTO\n' +
            tableName + '\n' +
           '(' + columnNames + ') VALUES\n' +
           '(' + insertingValues + ')\n' +
           'RETURNING *;\n'
  }

  function quoteLiteral(value) {
    return (value === null || typeof value == 'undefined') ?
      'NULL' : '\'' + String(value).replace(/'/g, '\'') + '\'';
  }
})
