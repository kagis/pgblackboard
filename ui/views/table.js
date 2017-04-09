define(function (require, exports, module) {
  'use strict';
  const el = require('../core/el');
  const on = require('../core/on');
  const dispatch = require('../core/dispatch');

  module.exports = render_table;
  
  function render_table({
    fields,
    rows,
    edits,
    src_table,
    rowset_index,
    can_update_and_delete,
    can_insert
  }) {
    
    const {
      deletes = {},
      inserts = [],
      updates = {},
      updates_errors = {},
      inserts_errors = [],
    } = edits || {};
    
    const {
      key_columns = [],
      table_name
    } = src_table || {};
    
    const key_field_indexes = key_columns.map(
      key_column => fields.findIndex(
        ({ src_column }) => src_column == key_column
      )
    );

    return el('table.table'
      ,el.prop('rowset_index', rowset_index)
      ,el.prop('src_table_name', table_name)
      // ,el.prop('fields', fields)
      ,el.on('$created', e => e.target.virtualNode = e.virtualNode)

      ,el('thead.table__header'
        ,el('tr'
          ,el('th.table__corner')
          ,fields.map(field => el('th.table__colheader'
            ,el('div', field.name)
            ,el('div.table__coltype', field.typ)
          ))
        )
      )
      ,el('tbody'
        ,rows.map((row, row_index) => {
          const row_key = JSON.stringify(key_field_indexes
            .map(i => [key_columns[i], row[i]]));
          const row_updates = updates[row_key] || {};
          const error = updates_errors[row_key];
          const is_deleted = deletes[row_key];
          return el('tr.table-row'
            ,is_deleted && el.class('table-row--deleted')
            ,error && el.attr('title', error)
            ,error && el.class('table-row--invalid')
            ,el.attr('data-key', row_key)
            ,el('td.table__rowHeader'
              ,error && el('i.table-error_icon'
                ,el.attr('data-tooltip', error)
              )
              ,!error && el('span.table-counter'
                ,String(row_index + 1)
              )
              ,can_update_and_delete && (
                el('button.table-delete_row'
                  ,el.class(is_deleted
                    ? 'table-delete_row--on'
                    : 'table-delete_row--off'
                  )
                )
              )
            )
            ,fields.map((field, field_index) => {
              const is_updatable = can_update_and_delete && field.src_column;
              const original_value = row[field_index];
              const updated_value = row_updates[field.src_column];
              const is_updated = updated_value !== undefined;
              const display_value = is_updated ? updated_value : original_value;
  
              return el('td.table__cell'
                // ,el.prop('table', table_name)
                ,is_updated && el.attr(
                  'data-original-value',
                  JSON.stringify(original_value)
                )
                ,el.attr('data-column', field.src_column)
                ,is_updatable && el.class('table__cell--updatable')
                ,is_updatable && el.attr('contenteditable', 'true')
                ,field.is_num && el.class('table__cell--num')
                ,display_value === '' && el.class('table__cell--emptystr')
                ,display_value
              );
            })
          );
        })

        ,inserts.map((dict, index) => el('tr.table-row'
          ,el.attr('data-index', index)
          ,el('td.table__rowHeader'
            ,el('button.table-insert_cancel')
          )
          ,fields.map(field => {
            const val = dict[field.src_column];
            return el('td.table__cell.table__cell--inserted'
              ,el.attr('data-column', field.src_column)
              ,field.src_column && el.attr('contenteditable', 'true')
              ,field.is_num && el.class('table__cell--num')
              ,val === '' && el.class('table__cell--emptystr')
              ,val
            );
          })
        ))

        ,can_insert && (
          el('tr.table__newRow.table-row'
            ,el.attr('data-index', inserts.length)
            ,el('td.table__rowHeader')
            ,fields.map((field, field_index) => (
              el('td.table__cell.table__cell--inserted'
                ,el.attr('data-column', field.src_column)
                ,field.src_column && el.attr('contenteditable', 'true')
                ,field.is_num && el.class('table__cell--num')
              )
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

  on('.table__cell--updatable', 'input', function () {
    const td_el = this;
    const new_value = td_el.textContent;
    const original_value = td_el.hasAttribute('data-original-value')
      ? JSON.parse(td_el.getAttribute('data-original-value'))
      : NaN;
    dispatch({
      type: 'TABLE_UPDATE',
      table: this.closest('.table').virtualNode.src_table_name,
      key: this.closest('.table-row').dataset.key,
      column: this.dataset.column,
      value: original_value === new_value ? undefined : new_value,
    });
  });
  
  on('.table__cell--inserted', 'input', function () {
    const td_el = this;
    const value = td_el.textContent || undefined;
    dispatch({
      type: 'TABLE_INSERT',
      table: this.closest('.table').virtualNode.src_table_name,
      index: this.closest('.table-row').dataset.index,
      column: this.dataset.column,
      value,
    });
  });

  on('.table-delete_row--on', 'click', function (e) {
    e.stopImmediatePropagation();
    dispatch({
      type: 'TABLE_DELETE',
      table: this.closest('.table').virtualNode.src_table_name,
      key: this.closest('.table-row').dataset.key,
      should_delete: false,
    });
  });
  
  on('.table-delete_row--off', 'click', function (e) {
    e.stopImmediatePropagation();
    dispatch({
      type: 'TABLE_DELETE',
      table: this.closest('.table').virtualNode.src_table_name,
      key: this.closest('.table-row').dataset.key,
      should_delete: true,
    });
  });
  
  on('.table-insert_cancel', 'click', function () {
    dispatch({
      type: 'TABLE_INSERT_CANCEL',
      table: this.closest('.table').virtualNode.src_table_name,
      index: +this.closest('.table-row').dataset.index,
    });
  });

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
