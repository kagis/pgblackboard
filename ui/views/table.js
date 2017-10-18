define(function (require, exports, module) {
  'use strict';
  const el = require('../core/el');
  const on = require('../core/on');
  const dispatch = require('../core/dispatch');
  const bus = require('../core/bus');

  module.exports = render_table;

  function render_table({
    fields,
    rows,
    edits,
    src_table,
    stmt_index,
    can_update_and_delete,
    can_insert,
    focused_row_index,
  }) {

    const {
      inserts = [],
      inserts_errors = [],
      updates = {},
      updates_errors = {},
      deletes = {},
      deletes_errors = {},
    } = edits || {};

    const {
      key_columns = [],
      table_name,
      database
    } = src_table || {};

    const key_field_indexes = key_columns.map(
      key_column => fields.findIndex(
        ({ src_column }) => src_column == key_column
      )
    );

    return el('table.table'
      ,el.attr('data-stmt_index', stmt_index)
      ,el.attr(
        'data-database_and_table',
        JSON.stringify([database, table_name])
      )
      ,el.on('$created', e => e.target.virtualNode = e.virtualNode)

      ,el('thead.table-header'
        ,el('tr'
          ,el('th.table-corner')
          ,fields.map(field => el('th.table-colheader'
            ,el('div', field.name)
            ,el('div.table-coltype', field.typ)
          ))
        )
      )
      ,el('tbody'
        ,rows.map((row, row_index) => {
          const row_key = JSON.stringify(key_field_indexes
            .map(i => [key_columns[i], row[i]]));
          const row_updates = updates[row_key] || {};
          const error = deletes_errors[row_key] || updates_errors[row_key];
          const is_deleted = deletes[row_key];
          const has_updates = Object.keys(row_updates).length;
          return el('tr.table-row'
            ,focused_row_index === row_index && el.class('table-row--highlighted')
            ,el.attr('id', `table-row--${stmt_index}_${row_index}`)
            ,is_deleted && el.class('table-row--deleted')
            ,error && el.class('table-row--invalid')
            ,el.attr('data-key', row_key)
            ,el('td.table-rowheader'
              ,error && el('i.table-error_icon'
                ,el.attr('data-tooltip', error)
              )
              ,!error && el('span.table-counter'
                ,String(row_index + 1)
              )
              ,has_updates && (
                el('button.table-update_cancel')
              )
              ,can_update_and_delete && !has_updates && (
                el('button.table-delete_row'
                  ,is_deleted && el.class('table-delete_row--on')
                  ,!is_deleted && el.class('table-delete_row--off')
                )
              )
            )
            ,fields.map((field, field_index) => {
              const is_updatable = can_update_and_delete && field.src_column;
              const original_value = row[field_index];
              const updated_value = row_updates[field.src_column];
              const is_updated = updated_value !== undefined;
              const display_value = is_updated ? updated_value : original_value;

              return el('td.table-cell'
                ,el.attr('tabindex', '0')
                ,is_updated && el.attr(
                  'data-original-value',
                  JSON.stringify(original_value)
                )
                // ,is_updated && el.class('table-cell--updated')
                ,field.src_column && el.attr('data-column', field.src_column)
                ,is_updatable && el.class('table-cell--updatable')
                ,is_updatable && el.attr('contenteditable', 'plaintext-only')
                ,field.is_num && el.class('table-cell--num')
                ,display_value === '' && el.class('table-cell--emptystr')
                ,display_value
              );
            })
          );
        })

        ,inserts.map((dict, index) => [dict, inserts_errors[index]])
          .map(([dict, error], index) => el('tr.table-row'
            ,el.attr('data-index', index)
            ,error && el.class('table-row--invalid')
            ,el('td.table-rowheader'
              ,error && el('i.table-error_icon'
                ,el.attr('data-tooltip', error)
              )
              ,el('button.table-insert_cancel')
            )
            ,fields.map(field => {
              const val = dict[field.src_column];
              return el('td.table-cell.table-cell--inserted'
                ,el.attr('tabindex', '0')
                ,el.attr('data-column', field.src_column)
                ,field.src_column && el.attr('contenteditable', 'plaintext-only')
                ,field.is_num && el.class('table-cell--num')
                ,val === '' && el.class('table-cell--emptystr')
                ,val
              );
            })
          ))

        ,can_insert && (
          el('tr.table-newrow.table-row'
            ,el.attr('data-index', inserts.length)
            ,el('td.table-rowheader')
            ,fields.map((field, field_index) => (
              el('td.table-cell.table-cell--inserted'
                ,el.attr('tabindex', '0')
                ,el.attr('data-column', field.src_column)
                ,field.src_column && el.attr('contenteditable', 'plaintext-only')
                ,field.is_num && el.class('table-cell--num')
              )
            ))
          )
        )
      )
    );
  }

  on('.table-cell--updatable', 'input', function () {
    const td_el = this;
    const new_value = td_el.textContent;
    const original_value = td_el.hasAttribute('data-original-value')
      ? JSON.parse(td_el.getAttribute('data-original-value'))
      : NaN;
    dispatch({
      type: 'TABLE_UPDATE',
      database_and_table: this.closest('.table').dataset.database_and_table,
      key: this.closest('.table-row').dataset.key,
      column: this.dataset.column,
      value: original_value === new_value ? undefined : new_value,
    });
  });

  on('.table-cell--inserted', 'input', function () {
    const td_el = this;
    const value = td_el.textContent || undefined;
    dispatch({
      type: 'TABLE_INSERT',
      database_and_table: this.closest('.table').dataset.database_and_table,
      index: this.closest('.table-row').dataset.index,
      column: this.dataset.column,
      value,
    });
  });

  on('.table-delete_row--on', 'click', function (e) {
    e.stopImmediatePropagation();
    dispatch({
      type: 'TABLE_DELETE',
      database_and_table: this.closest('.table').dataset.database_and_table,
      key: this.closest('.table-row').dataset.key,
      should_delete: false,
    });
  });

  on('.table-delete_row--off', 'click', function (e) {
    e.stopImmediatePropagation();
    dispatch({
      type: 'TABLE_DELETE',
      database_and_table: this.closest('.table').dataset.database_and_table,
      key: this.closest('.table-row').dataset.key,
      should_delete: true,
    });
  });

  on('.table-insert_cancel', 'click', function () {
    dispatch({
      type: 'TABLE_INSERT_CANCEL',
      database_and_table: this.closest('.table').dataset.database_and_table,
      index: +this.closest('.table-row').dataset.index,
    });
  });

  on('.table-update_cancel', 'click', function () {
    dispatch({
      type: 'TABLE_UPDATE_CANCEL',
      database_and_table: this.closest('.table').dataset.database_and_table,
      key: this.closest('.table-row').dataset.key,
    });
  });

  on('.table-cell', 'focus', function () {
    dispatch({
      type: 'ROW_FOCUS',
      stmt_index: +this.closest('.table').dataset.stmt_index,
      row_index: this.closest('.table-row').rowIndex - 1,
      should_map_move: true,
    });
  });

  bus.on('rendered:ROW_FOCUS', ({ stmt_index, row_index, should_table_scroll }) => {
    if (should_table_scroll) {
      (document.getElementById(`table-row--${stmt_index}_${row_index + 1}`) ||
      document.getElementById(`table-row--${stmt_index}_${row_index}`))
        .scrollIntoView(false /* bottom */);
    }
  });

});
