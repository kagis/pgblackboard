define(function (require, exports, module) {
'use strict';
  const merge = require('core/merge');

  module.exports = (state, action) => {
    switch (action.type) {
      case 'INIT':
      case 'TREENODE_DEFINITION_LOADED':
      case 'MYQUERY_SELECT':
        return {
          use_map: false,
          items: null,
        };

      case 'EXEC':
        return {
          use_map: action.use_map,
          items: [],
        };

      case 'EXPAND_QUERY_PLAN':
        return merge(state, {
          items: {
            [action.resultIndex]: {
              isFullPageView: true,
            },
          },
        });
        // return versioned.extend(state, ['items', action.resultIndex], {
        //   isFullPageView: true
        // });

      case 'COLLAPSE_QUERY_PLAN':
        return merge(state, {
          items: {
            [action.resultIndex]: {
              isFullPageView: false,
            },
          },
        });
        // return versioned.extend(state, ['items', action.resultIndex], {
        //   isFullPageView: false
        // });

      case 'MOVE_QUERY_PLAN':
        return merge(state, {
          items: {
            [action.resultIndex]: action.extent,
          },
        });
        // return versioned.extend(state, ['items', action.resultIndex], action.extent);

      case 'STATEMENT_EXECUTING':
        return merge(state, {
          items: merge.push({
            rows: [],
            notices: [],
            changes: {},
          }),
        })

      case 'STATEMENT_COMPLETE':
        return merge(state, {
          items: {
            [state.items.length - 1]: {
              commandTag: action.commandTag,
            },
          },
        });

      case 'STATEMENT_ERROR':
        return merge(state, {
          items: {
            [state.items.length - 1]: {
              error: {
                message: action.message,
                linecol: action.linecol,
              },
            },
          },
        });

      case 'STATEMENT_NOTICE':
        return merge(state, {
          items: {
            [state.items.length - 1]: {
              notices: merge.push(action.notice),
            },
          },
        });

      case 'STATEMENT_DESCRIBE':
        return merge(state, {
          items: {
            [state.items.length - 1]: action.description,
          },
        });

      case 'STATEMENT_ROWS':
        return merge(state, {
          items: {
            [state.items.length - 1]: {
              rows: state
                .items[state.items.length - 1]
                .rows
                .concat(action.rows)
            },
          },
        });

      case 'EDIT_ROW': {
        const new_values = action.values;
        const old_values = state
          .items[action.rowset_index]
          .rows[action.row_index];

        const has_changes = !old_values || old_values.some(
          (old_value, index) => old_value != new_values[index]
        );

        return merge(state, {
          items: {
            [action.rowset_index]: {
              changes: {
                [action.row_index]: has_changes ? new_values : undefined,
              },
            },
          },
        });
      }

      case 'DELETE_ROW':
        return merge(state, {
          items: {
            [action.rowset_index]: {
              changes: {
                [action.row_index]: 'delete',
              },
            },
          },
        });

      case 'UNDELETE_ROW':
        return merge(state, {
          items: {
            [action.rowset_index]: {
              changes: {
                [action.row_index]: undefined,
              },
            },
          },
        });

      default:
        return state;
    }
  };
});
