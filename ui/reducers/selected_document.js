define(function (require, exports, module) {
  'use strict';
  
  module.exports = (state, action) => {
    switch (action.type) {
      case 'INIT':
        return {
          content: '\\connect postgres\n\nSELECT \'hello \' || current_user;',
        };

      case 'TREENODE_SELECT':
        return Object.assign({}, state, {
          is_loading: true
        });

      case 'TREENODE_DEFINITION_LOADED':
        return {
          is_loading: false,
          content: action.content
        };

      case 'DRAFTS_SELECT':
        return { draft_id: action.draft_id };

      case 'DRAFTS_ADD':
        return { draft_id: action.draft.id };

      case 'SELECT_SCRIPT_FRAGMENT':
        return Object.assign({}, state, {
          selection_ranges: action.ranges
        });

      case 'EXEC':
        return Object.assign({}, state, {
          errors: []
        });

      case 'STATEMENT_ERROR':
        return Object.assign({}, state, {
          errors: (state.errors || []).concat([{
            text: action.message,
            linecol: action.linecol,
          }])
        });

      case 'NAVIGATE_TO_MESSAGE_SOURCE':
        return Object.assign({}, state, {
          selection_ranges: [
            {
              head: { line: action.line, ch: 0 },
              anchor: { line: action.line, ch: 0 }
            }
          ]
        });

      default:
        return state;
    }
  };
  
});
