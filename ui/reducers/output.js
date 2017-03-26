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
            dirtyRows: {},
          }),
        })

      case 'STATEMENT_COMPLETE':
        return merge(state, {
          items: {
            [state.items.length - 1]: {
              commandTag: action.commandTag,
            },
          },
        })

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
        })

      case 'STATEMENT_NOTICE':
        return merge(state, {
          items: {
            [state.items.length - 1]: {
              notices: merge.push(action.notice),
            },
          },
        })

      case 'STATEMENT_DESCRIBE':
        return merge(state, {
          items: {
            [state.items.length - 1]: action.description,
          },
        })

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
        })

      case 'EDIT_ROW':
        const oldValues = state
          .items[action.rowsetIndex]
          .rows[action.rowIndex]

        const hasChanges = !oldValues || oldValues.some(
          (oldValue, index) => oldValue != action.values[index]
        )

        return merge(state, {
          items: {
            [action.rowsetIndex]: {
              dirtyRows: {
                [action.rowIndex]: hasChanges ? action.values : undefined,
              },
            },
          },
        })

      case 'DELETE_ROW':
        return merge(state, {
          items: {
            [action.rowsetIndex]: {
              dirtyRows: {
                [action.rowIndex]: 'delete',
              },
            },
          },
        })

      case 'UNDELETE_ROW':
        return merge(state, {
          items: {
            [action.rowsetIndex]: {
              dirtyRows: {
                [action.rowIndex]: undefined,
              },
            },
          },
        })

      case 'UPDATE_ROW':
        const fields = state.items[action.rowsetIndex].fields;
        return merge(state, {
          items: {
            [action.rowsetIndex]: {
              rows: {
                [action.rowIndex]: Object.keys(action.rowDict).reduce(
                  (acc, columnName) => (acc[fields.findIndex(it => it.src_column && it.src_column.name == columnName)] = action.rowDict[columnName], acc),
                  { dirtyValues: null }
                ),
              },
            },
          },
        });

      case 'REQUEST_UPDATE_ROW':
        return merge(state, {
          items: {
            [action.rowsetIndex]: {
              rows: {
                [action.rowIndex]: {
                  dirtyValues: action.values,
                },
              },
            },
          },
        });
        // const rowset = state.items[action.rowsetIndex];
        // const row = rowset.rows[action.rowIndex];
        // for (let i = 0; i < row.length; i++) {
        //   const field = rowset.fields[i];
        //   if (field.src_column && field.src_column.name in action.changes) {
        //     row[i] = action.changes[field.src_column.name];
        //   }
        // }
        // return state;

      default:
        return state;
    }
  }
});
