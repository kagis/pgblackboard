define(function (require, exports, module) {
  'use strict';

  module.exports = modificationScript;

  function modificationScript({ items }) {
    if (!(items && items.length)) {
      return null;
    }
    return items
      .filter(stmtResult => Object.keys(stmtResult.dirtyRows).length)
      .map(stmtResult => tableModificationScript(stmtResult))
      .reduce((a, b) => a.concat(b));
  }

  function tableModificationScript({
    rows,
    dirtyRows: changes,
    sourceTable: { schemaName, tableName, columns },
  }) {

    const fullTableName = quoteIdent(schemaName) + '.' + quoteIdent(tableName);

    const insertingRows =
      Object.keys(changes)
        .filter(rowIndex => !(rowIndex in rows))
        .map(rowIndex => changes[rowIndex])

    const updatingRowsIndexes =
      Object.keys(changes)
        .filter(rowIndex => rowIndex in rows && changes[rowIndex] != 'delete')

    const deletingRows =
      Object.keys(changes)
        .filter(rowIndex => rowIndex in rows && changes[rowIndex] == 'delete')
        .map(rowIndex => rows[rowIndex])

    let script = [];

    if (deletingRows.length) {
      const keyColumns = columns.filter(col => col.isKey)
      script.push(
        'DELETE FROM ' + fullTableName +
        ' WHERE (' + keyColumns.map(col => col.name).map(quoteIdent).join(', ') +
        ') IN (' +
        deletingRows.map(row => '(' +
          keyColumns.map(col => row[col.fieldIndex])
                    .map(quoteLiteral)
                    .join(', ') +
          ')')
        .join(', ') + ')'
      );
    }

    if (insertingRows.length) {
      script.push(
        'INSERT INTO ' + fullTableName +

        '\n(' + columns.map(col => col.name).map(quoteIdent).join(', ') + ')' +
        ' VALUES \n' + insertingRows.map(
          insertingRow => '(' + columns
            .map(col => insertingRow[col.fieldIndex])
            .map(quoteLiteral)
            .join(', ') + ')'
        ).join(',\n') + ';'
      );
    }

    if (updatingRowsIndexes.length) {
      script = script.concat(
        updatingRowsIndexes.map(function (updatingRowIndex) {
          const newValues = changes[updatingRowIndex]
          const oldValues = rows[updatingRowIndex]
          return 'UPDATE ' + fullTableName +
            ' SET ' +
            columns
              .filter(col => newValues[col.fieldIndex] != oldValues[col.fieldIndex])
              .map(col => quoteIdent(col.name) + ' = ' + quoteLiteral(newValues[col.fieldIndex]))
              .join(', ') +
            ' WHERE ' +
            columns
              .filter(col => col.isKey)
              .map(col => quoteIdent(col.name) + ' = ' + quoteLiteral(oldValues[col.fieldIndex]))
              .join(' AND ')
        })
      );
    }

    return script
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

  function quoteIdent(ident) {
    return '"' + ident.replace(/"/g, '""') + '"'
  }
})
