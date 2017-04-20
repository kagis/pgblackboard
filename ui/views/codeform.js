define(function (require, exports, module) {
  'use strict';
  const dispatch = require('../core/dispatch');
  const el = require('../core/el');
  const render_codemirror = require('./codemirror');
  const render_spinner_shield = require('./spinner_shield');
  const render_execbar = require('./execbar');
  const drafts_update = require('../actions/drafts_update');
  const drafts_add = require('../actions/drafts_add');

  module.exports = render_codeform;

  function render_codeform({
    content,
    selection_ranges,
    errors,
    is_loading,
    draft_id
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
        ,render_execbar()
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

  }
});
