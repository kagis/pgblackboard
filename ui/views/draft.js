
import el from '../core/el.js';
import dispatch from '../core/dispatch.js';
import drafts_remove from '../actions/drafts_remove.js';

export default ({ is_selected, draft }) => (
  el('div.draft'
    ,is_selected && el.class('draft--selected')
    ,el('a.draft-title'
      ,el.on('click', _ => dispatch({
        type: 'DRAFTS_SELECT',
        draft_id: draft.id,
      }))

      ,el('i.draft-icon')
      ,el('span', get_draft_title(draft.content))
    )
    ,el('button.draft-remove'
      ,el.on('click', _ => dispatch(drafts_remove(draft.id)))
      ,'remove'
    )
  )
);

function get_draft_title(sql_script) {
  var sql_script = sql_script.trim()
  var m = /\\connect\s+\w+\s*([\s\S]+)/.exec(sql_script)
  if (m) {
    sql_script = m[1];
  }
  return sql_script.substr(0, 100) || '(empty)';
}
