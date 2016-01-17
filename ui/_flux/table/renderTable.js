'use strict';

csslink('./table.css');

define(function (require, exports, module) {
  const el = require('core/el');
  const on = require('core/on');
  const dispatch = require('core/dispatch');

  module.exports = renderTable;

  function renderTable(rowset, rowsetIndex) {
    return el('table.table'
      ,el.prop('rowset', rowset)
      ,el.prop('rowsetIndex', rowsetIndex)
      ,el.on('$created', e => e.target.virtualNode = e.virtualNode)

      ,el('thead'
        ,el('tr'
          ,el('th.table__corner')
          ,rowset.fields.map(field => el('th.table__colheader'
            ,el('div', field.name)
            ,el('div.table__coltype', field.typ)
          ))
        )
      )
      ,el('tbody'
        ,rowset.rows.map((row, rowIndex) => el('tr.table__row'
          ,el('td.table__rowheader')
          ,row.map((val, fieldIndex) => {
            const field = rowset.fields[fieldIndex];
            return el('td.table__cell'
              ,el.attr('contenteditable', 'true')
              ,field['is_num'] && el.class('table__cell--num')
              ,val === '' && el.class('table__cell--emptystr')
              ,val
            );
          })
        ))
      )
    );
  }

  on('.table__row', 'blur', function () {
    const blurredRowEl = this;
    setTimeout(function () {
      const focusedEl = blurredRowEl.ownerDocument.activeElement;
      if (blurredRowEl !== focusedEl.parentNode/*TR*/) {
        updateRowIfDirty(blurredRowEl);
      }
    }, 10);
  });

  function updateRowIfDirty(rowEl) {
    const fields = getRowFieldsDescriptions(rowEl);
    const currentValues = getInputtedRowValues(rowEl);
    const originalValues = getRowOriginalValues(rowEl);
    const changes = Object.create(null);
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      const srcColumn = field.src_column;
      const fieldIsEditable = Boolean(srcColumn);
      const currentValue = currentValues[i];
      const originalValue = originalValues[i];
      if (fieldIsEditable && currentValue != originalValue) {
        changes[srcColumn.name] = currentValue;
      }
    }
    const hasChanges = Object.keys(changes).length;
    if (hasChanges) {
      const tablePath = fields.map(field => field.src_column)
                              .filter(Boolean)
                              .map(srccol => srccol.table_path)
                              [0];

      dispatch(updateTable({
        rowsetIndex: getRowsetIndex(rowEl),
        rowIndex: getRowIndex(rowEl),
        values: currentValues,
        key: getRowKey(rowEl),
        changes,
        tablePath,
      }));
    }
  }

  function getRowIndex(rowEl) {
    return Array.prototype.indexOf.call(rowEl.parentNode.childNodes, rowEl)
  }

  function getRowsetIndex(rowEl) {
    const tableEl = rowEl.parentNode.parentNode
    return tableEl.virtualNode['rowsetIndex'];
  }

  function getRowKey(rowEl) {
    const originalValues = getRowOriginalValues(rowEl);
    const fields = getRowFieldsDescriptions(rowEl);

    const keyFieldIndexes =
      fields.map((field, index) => Boolean(field.src_column) &&
                                   Boolean(field.src_column.is_key) &&
                                   index)
            .filter(index => typeof index == 'number');

    return objectFromKeysAndValues(
      retainIndexes(fields, keyFieldIndexes).map(field => field.src_column.name),
      retainIndexes(originalValues, keyFieldIndexes)
    );

    function retainIndexes(arr, indexes) {
      return arr.filter((_, index) => !(indexes.indexOf(index) < 0))
    }
  }

  function getInputtedRowValues(rowEl) {
    const result = [];
    for (let i = 1; i < rowEl.cells.length; i++) {
      result.push(rowEl.cells[i].textContent);
    }
    return result;
  }

  function getRowOriginalValues(rowEl) {
    const rowIndex = getRowIndex(rowEl);
    const tableEl = rowEl.parentNode.parentNode
    const rowset = tableEl.virtualNode.rowset;
    return rowset.rows[rowIndex];
  }

  function getRowFieldsDescriptions(rowEl) {
    const tableEl = rowEl.parentNode.parentNode
    const rowset = tableEl.virtualNode.rowset;
    return rowset.fields;
  }

  function objectFromKeysAndValues(keys, values) {
    return keys.reduce(
      (obj, key, i) => (obj[key] = values[i], obj),
      Object.create(null)
    );
  }

  function diffObject(a, b) {
    const diff = Object.create(null);
    for (let key in a) {
      if (a[key] !== b[key]) {
        diff[key] = a[key];
      }
    }
    if (Object.keys(diff).length) {
      return diff;
    }
  }

  function tupleDiff(a, b) {

  }
});
