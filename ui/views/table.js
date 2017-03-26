define(function (require, exports, module) {
  'use strict';
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
          ,el('td.table__rowHeader'
            ,rowIndex in rowset.dirtyRows && '*'
            ,el('input.table__removeRowToggler'
              ,el.attr('type', 'checkbox')
              ,el.attr('checked', rowset.dirtyRows[rowIndex] == 'delete')
            )
          )
          ,rowset.fields.map((field, fieldIndex) => {

            const val = rowset.dirtyRows[rowIndex] && rowset.dirtyRows[rowIndex] != 'delete' ?
              rowset.dirtyRows[rowIndex][fieldIndex] :
              row[fieldIndex]

            return el('td.table__cell'
              ,el.attr('contenteditable', 'true')
              ,field['is_num'] && el.class('table__cell--num')
              ,val === '' && el.class('table__cell--emptystr')
              ,val
            );
          })
        ))

        ,Object.keys(rowset.dirtyRows)
          .filter(rowIndex => !(rowIndex in rowset.rows))
          .map(rowIndex => [rowset.dirtyRows[rowIndex], rowIndex])
          .map(([row, rowIndex]) => el('tr.table__row'
            ,el('td.table__rowHeader'
              ,'*'
            )
            ,rowset.fields.map((field, fieldIndex) => {
              const val = row[fieldIndex];
              return el('td.table__cell'
                ,el.attr('contenteditable', 'true')
                ,field['is_num'] && el.class('table__cell--num')
                ,val === '' && el.class('table__cell--emptystr')
                ,val
              );
            })
          ))

        ,el('tr.table__newRow.table__row'
          ,el('td.table__rowHeader')
          ,rowset.fields.map((field, fieldIndex) => el('td.table__cell'
            ,el.attr('contenteditable', 'true')
            ,field['is_num'] && el.class('table__cell--num')
            // ,el.on('input', e => dispatch({
            //   type: 'EDIT_ROW',
            //   rowsetIndex: rowsetIndex,
            //   rowIndex: Math.max(rowset.rows.length - 1, ...Object.keys(rowset.dirtyRows)) + 1,
            //   values: Object.assign(rowset.fields.map(_ => null)),
            // }))
          ))
        )
      )
    );
  }

  // on('.table__cell', 'blur', function (e) {
  //   dispatch(editTableCell({
  //
  //   }))
  // })

  on('.table__row', 'input', function () {
    dispatch({
      type: 'EDIT_ROW',
      values: getInputtedRowValues(this),
      rowsetIndex: getRowsetIndex(this),
      rowIndex: getRowIndex(this),
    })
  })

  on('.table__removeRowToggler', 'change', function (e) {
    const rowEl = this.closest('.table__row')
    if (this.checked) {
      dispatch({
        type: 'DELETE_ROW',
        rowsetIndex: getRowsetIndex(rowEl),
        rowIndex: getRowIndex(rowEl),
      })
    } else {
      dispatch({
        type: 'UNDELETE_ROW',
        rowsetIndex: getRowsetIndex(rowEl),
        rowIndex: getRowIndex(rowEl),
      })
    }
  })

  function getRowIndex(rowEl) {
    return Array.prototype.indexOf.call(rowEl.parentNode.childNodes, rowEl)
  }

  function getRowsetIndex(rowEl) {
    const tableEl = rowEl.parentNode.parentNode
    return tableEl.virtualNode['rowsetIndex'];
  }


  function getInputtedRowValues(rowEl) {
    return Array.from(rowEl.cells)
      .slice(1) // skip row header
      .map(cellEl => cellEl.textContent);
  }

});
