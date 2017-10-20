import dispatch from '../core/dispatch.js';
import el from '../core/el.js';
import render_codemirror from './codemirror.js';
import render_spinner_shield from './spinner_shield.js';
import render_execbar from './execbar.js';
import drafts_update from '../actions/drafts_update.js';
import drafts_add from '../actions/drafts_add.js';

export default function render_codeform({
  content,
  selection_ranges,
  errors,
  is_loading,
  draft_id,
  is_executing,
}) {
  return el('div.codeform'

    ,render_spinner_shield({
      is_visible: is_loading,
    })

    ,render_codemirror({
      value: content,
      is_read_only: is_loading,
      errors,
      selection_ranges: selection_ranges,
      on_change: handle_change,
    })

    ,el('div.codeform-execbar'
      ,render_execbar({ is_executing })
    )
  );

  function handle_change({ value, selection_ranges, value_has_changed }) {
    if (value_has_changed) {
      if (draft_id) {
        dispatch(drafts_update(draft_id, value));
      } else {
        dispatch(drafts_add(value));
      }
    }

    dispatch({
      type: 'SELECT_SCRIPT_FRAGMENT',
      ranges: selection_ranges,
    });
  }

};
