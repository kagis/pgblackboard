define(function (require, exports, module) {
  'use strict';

  module.exports = modificationScript;

  function modificationScript({ items }) {
    if (items && items.length) {
      const script = items
        .filter(stmtResult => Object.keys(stmtResult.dirtyRows).length)
        .map(stmtResult => tableModificationScript(stmtResult))
        .join('\n\n')

      return script;
    }
  }

  function tableModificationScript({ rows, dirtyRows, fields, sourceTable }) {

    const fullTableName =
      quoteIdent(sourceTable.schemaName) + '.' +
      quoteIdent(sourceTable.tableName)

    const insertingRows =
      Object.keys(dirtyRows)
        .filter(rowIndex => !(rowIndex in rows))
        .map(rowIndex => dirtyRows[rowIndex])

    const updatingRowsIndexes =
      Object.keys(dirtyRows)
        .filter(rowIndex => rowIndex in rows &&
                            dirtyRows[rowIndex] != 'delete')

    const deletingRows =
      Object.keys(dirtyRows)
        .filter(rowIndex => rowIndex in rows &&
                            dirtyRows[rowIndex] == 'delete')
        .map(rowIndex => rows[rowIndex])

    let script = ''

    if (deletingRows.length) {
      const keyColumns = sourceTable.columns.filter(col => col.isKey)
      script +=
        'DELETE FROM ' + fullTableName +
        ' WHERE (' + keyColumns.map(col => col.name).map(quoteIdent).join(', ') +
        ') IN (' +
        deletingRows.map(row => '(' +
          keyColumns.map(col => row[col.fieldIndex])
                    .map(quoteLiteral)
                    .join(', ') +
          ')')
        .join(', ') + ');'
    }

    if (insertingRows.length) {
      script +=
        'INSERT INTO ' + fullTableName +

        '\n(' + sourceTable.columns.map(col => col.name).map(quoteIdent).join(', ') + ')' +
        ' VALUES \n' + insertingRows.map(
          insertingRow => '(' + sourceTable.columns
            .map(col => insertingRow[col.fieldIndex])
            .map(quoteLiteral)
            .join(', ') + ')'
        ).join(',\n') + ';\n\n'
    }

    if (updatingRowsIndexes.length) {
      script +=
        updatingRowsIndexes.map(function (updatingRowIndex) {
          const newValues = dirtyRows[updatingRowIndex]
          const oldValues = rows[updatingRowIndex]
          return 'UPDATE ' + fullTableName +
            ' SET ' +
            sourceTable.columns
              .filter(col => newValues[col.fieldIndex] != oldValues[col.fieldIndex])
              .map(col => quoteIdent(col.name) + ' = ' + quoteLiteral(newValues[col.fieldIndex]))
              .join(', ') +
            ' WHERE ' +
            sourceTable.columns
              .filter(col => col.isKey)
              .map(col => quoteIdent(col.name) + ' = ' + quoteLiteral(oldValues[col.fieldIndex]))
              .join(' AND ') +
            ';'
        }).join('\n\n')
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
