define(function (require, exports, module) {
  'use strict';
  const el = require('core/el');
  const on = require('core/on');
  const dispatch = require('core/dispatch');

  module.exports = renderTable;

  function renderTable({
    fields,
    rows,
    changes,
    rowset_index,
    can_update_and_delete,
    can_insert
  }) {
    
    return el('table.table'
      ,el.prop('rowset_index', rowset_index)
      ,el.on('$created', e => e.target.virtualNode = e.virtualNode)

      ,el('thead'
        ,el('tr'
          ,el('th.table__corner')
          ,fields.map(field => el('th.table__colheader'
            ,el('div', field.name)
            ,el('div.table__coltype', field.typ)
          ))
        )
      )
      ,el('tbody'
        ,rows.map((row, row_index) => el('tr.table__row'
          ,el('td.table__rowHeader'
            ,row_index in changes && '*'
            ,can_update_and_delete && (
              el('input.table__removeRowToggler'
                ,el.attr('type', 'checkbox')
                ,el.attr('checked', changes[row_index] == 'delete')
              )
            )
          )
          ,fields.map((field, field_index) => {

            const val = changes[row_index] && changes[row_index] != 'delete' ?
              changes[row_index][field_index] :
              row[field_index]

            return el('td.table__cell'
              ,can_update_and_delete && (
                el.attr('contenteditable', 'true')
              )
              ,field['is_num'] && el.class('table__cell--num')
              ,val === '' && el.class('table__cell--emptystr')
              ,val
            );
          })
        ))

        ,Object.keys(changes)
          .filter(row_index => !(row_index in rows))
          .map(row_index => [changes[row_index], row_index])
          .map(([row, row_index]) => el('tr.table__row'
            ,el('td.table__rowHeader'
              ,'*'
            )
            ,fields.map((field, field_index) => {
              const val = row[field_index];
              return el('td.table__cell'
                ,el.attr('contenteditable', 'true')
                ,field['is_num'] && el.class('table__cell--num')
                ,val === '' && el.class('table__cell--emptystr')
                ,val
              );
            })
          ))

        ,can_insert && (
          el('tr.table__newRow.table__row'
            ,el('td.table__rowHeader')
            ,fields.map((field, field_index) => el('td.table__cell'
              ,el.attr('contenteditable', 'true')
              ,field['is_num'] && el.class('table__cell--num')
              // ,el.on('input', e => dispatch({
              //   type: 'EDIT_ROW',
              //   rowset_index: rowset_index,
              //   row_index: Math.max(rows.length - 1, ...Object.keys(changes)) + 1,
              //   values: Object.assign(fields.map(_ => null)),
              // }))
            ))
          )
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
      values: get_inputted_row_values(this),
      rowset_index: get_rowset_index_by_el(this),
      row_index: get_row_index_by_el(this),
    })
  })

  on('.table__removeRowToggler', 'change', function (e) {
    const row_el = this.closest('.table__row')
    dispatch({
      type: this.checked ? 'DELETE_ROW' : 'UNDELETE_ROW',
      rowset_index: get_rowset_index_by_el(row_el),
      row_index: get_row_index_by_el(row_el),
    })
  })

  function get_row_index_by_el(row_el) {
    return Array.prototype.indexOf.call(row_el.parentNode.childNodes, row_el)
  }

  function get_rowset_index_by_el(row_el) {
    const table_el = row_el.parentNode.parentNode
    return table_el.virtualNode['rowset_index'];
  }


  function get_inputted_row_values(row_el) {
    return Array.from(row_el.cells)
      .slice(1) // skip row header
      .map(cell_el => cell_el.textContent);
  }

});
