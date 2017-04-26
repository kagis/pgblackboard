define(function (require, exports, module) {
  'use strict';
  const el = require('../core/el')
  const dispatch = require('../core/dispatch')
  const render_table = require('./table')
  const render_queryplan = require('./queryplan')
  const render_map = require('./map')
  const table_save_edits = require('../actions/table_save_edits');

  module.exports = render_output;

  function render_output({ use_map, edits, stmt_results, errors }) {
    if (!stmt_results) {
      return null;
    }

    return {
      key: use_map ? 'map' : 'sheet',
      children: use_map
        ? render_map({ edits, stmt_results, errors })
        : render_tables({ edits, stmt_results, errors }),
    };
  }

  function render_tables({ edits, stmt_results, errors }) {
    return el('div.output'
    
      ,Object.keys(edits).length && (
        el('div.output-cornerbar'
          ,el.prop('key', 'cornerbar')
          ,el('button.output-save_edits'
            ,el.on('click', _ => dispatch(table_save_edits()))
            ,'save edits'
          )
        )
      )

      ,stmt_results.map((stmt_result, stmt_index) => render_stmt_result({
        stmt_result,
        stmt_index,
        edits,
      }))
      ,errors.map(({ message }) => (
        el('div.message.message--error'
          ,message
        )
      ))
    );
  }

  function render_stmt_result({
    edits,
    stmt_result: {
      src_table,
      fields,
      rows,
      error,
      command_tag,
      queryplan
    },
    stmt_index
  }) {
    return el('div.stmt_result'
      ,error && el('div.message.message--error'
        ,error.message
      )
      ,fields && fields.length && el.memoize(render_table, {
        rows,
        fields,
        edits: src_table && edits[JSON.stringify([
          src_table.database,
          src_table.table_name,
        ])],
        src_table,
        stmt_index,
        can_update_and_delete: src_table &&  src_table.key_columns.length,
        can_insert: src_table && Object.entries(src_table.columns).every(
          ([col, { has_default, is_notnull }]) => has_default || !is_notnull || 
            fields.some(({ src_column }) => src_column == col)
        ),
      })
      ,command_tag && el('div.message'
        ,command_tag
      )
      ,queryplan && render_queryplan(queryplan)
    )
  }

});
