import el from '../core/el.js';
import dispatch from '../core/dispatch.js';
import render_table from './table.js';
import render_queryplan from './queryplan.js';
import render_map from './map.js';
import { vertical_splitpanel } from './splitpanel.js';
import table_save_edits from '../actions/table_save_edits.js';
import render_layers from './layers.js';

export default function render_output({
  use_map,
  edits,
  stmt_results,
  errors,
  focused_row,
  split
}) {
  if (!stmt_results) {
    return null;
  }

  const show_map = split < 1;

  return vertical_splitpanel({
    on_ratio_change: ratio => dispatch({
      type: 'SPLIT_OUTPUT',
      ratio,
    }),
    ratio: split,
    top: el('div.output'
      ,el('div.output-scrollbox'
        ,stmt_results.map((stmt_result, stmt_index) => render_stmt_result({
          stmt_result,
          stmt_index,
          edits,
          focused_row_index: focused_row
            && focused_row.stmt_index == stmt_index
            && focused_row.row_index,
        }))
        ,errors.map(({ message }) => (
          el('div.message.message--error'
            ,message
          )
        ))
      )
      ,el('div.output-cornerbar'
        ,el('button.output-save_edits'
          ,!Object.keys(edits).length && el.attr('disabled', 'disabled')
          ,el.on('click', _ => dispatch(table_save_edits()))
          ,'save'
        )
        ,el('button.output-show_map'
          ,el.on('click', _ => dispatch({ type: 'MAP_TOGGLE' }))
          ,show_map && el.class('output-show_map--on')
          ,!show_map && el.class('output-show_map--off')
          ,'map'
        )
      )
    ),
    bottom: show_map && render_mapgroup({ edits, stmt_results, focused_row }),
  });
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
  stmt_index,
  focused_row_index,
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
      focused_row_index,
    })
    ,command_tag && el('div.message'
      ,command_tag
    )
    ,queryplan && render_queryplan(queryplan)
  )
}


const render_mapgroup = ({ edits, stmt_results, focused_row }) => (
  el('div.mapgroup'
    ,{ children: render_map({ edits, stmt_results, focused_row }) }
    ,render_layers({ stmt_results })
  )
);
