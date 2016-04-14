'use strict';

define(function (require, exports, module) {
  const merge = require('core/merge');

  module.exports = reduceExecOutput;

  function reduceExecOutput(execOutput, action) {
    switch (action.type) {
      case 'INIT':
      case 'TREENODE_DEFINITION_LOADED':
      case 'MYQUERY_SELECT':
        return {
          useMap: false,
          items: null,
        };

      case 'EXEC':
        return {
          useMap: action.useMap,
          items: [],
        };

      case 'EXPAND_QUERY_PLAN':
        return merge(execOutput, {
          items: {
            [action.resultIndex]: {
              isFullPageView: true,
            },
          },
        });
        // return versioned.extend(execOutput, ['items', action.resultIndex], {
        //   isFullPageView: true
        // });

      case 'COLLAPSE_QUERY_PLAN':
        return merge(execOutput, {
          items: {
            [action.resultIndex]: {
              isFullPageView: false,
            },
          },
        });
        // return versioned.extend(execOutput, ['items', action.resultIndex], {
        //   isFullPageView: false
        // });

      case 'MOVE_QUERY_PLAN':
        return merge(execOutput, {
          items: {
            [action.resultIndex]: action.extent,
          },
        });
        // return versioned.extend(execOutput, ['items', action.resultIndex], action.extent);

      case 'STATEMENT_EXECUTING':
        return merge(execOutput, {
          items: merge.push({
            rows: [],
            notices: [],
            dirtyRows: {},
          }),
        })

      case 'STATEMENT_COMPLETE':
        return merge(execOutput, {
          items: {
            [execOutput.items.length - 1]: {
              commandTag: action.commandTag,
            },
          },
        })

      case 'STATEMENT_ERROR':
        return merge(execOutput, {
          items: {
            [execOutput.items.length - 1]: {
              errorMessage: action.errorMessage,
            },
          },
        })

      case 'STATEMENT_NOTICE':
        return merge(execOutput, {
          items: {
            [execOutput.items.length - 1]: {
              notices: merge.push(action.notice),
            },
          },
        })

      case 'STATEMENT_DESCRIBE':
        return merge(execOutput, {
          items: {
            [execOutput.items.length - 1]: action.description,
          },
        })

      case 'STATEMENT_ROWS':
        return merge(execOutput, {
          items: {
            [execOutput.items.length - 1]: {
              rows: execOutput
                .items[execOutput.items.length - 1]
                .rows
                .concat(action.rows)
            },
          },
        })

      case 'EDIT_ROW':
        const oldValues = execOutput
          .items[action.rowsetIndex]
          .rows[action.rowIndex]

        const hasChanges = !oldValues || oldValues.some(
          (oldValue, index) => oldValue != action.values[index]
        )

        return merge(execOutput, {
          items: {
            [action.rowsetIndex]: {
              dirtyRows: {
                [action.rowIndex]: hasChanges ? action.values : undefined,
              },
            },
          },
        })

      case 'DELETE_ROW':
        return merge(execOutput, {
          items: {
            [action.rowsetIndex]: {
              dirtyRows: {
                [action.rowIndex]: 'delete',
              },
            },
          },
        })

      case 'UNDELETE_ROW':
        return merge(execOutput, {
          items: {
            [action.rowsetIndex]: {
              dirtyRows: {
                [action.rowIndex]: undefined,
              },
            },
          },
        })

      case 'UPDATE_ROW':
        const fields = execOutput.items[action.rowsetIndex].fields;
        return merge(execOutput, {
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
        return merge(execOutput, {
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
        // const rowset = execOutput.items[action.rowsetIndex];
        // const row = rowset.rows[action.rowIndex];
        // for (let i = 0; i < row.length; i++) {
        //   const field = rowset.fields[i];
        //   if (field.src_column && field.src_column.name in action.changes) {
        //     row[i] = action.changes[field.src_column.name];
        //   }
        // }
        // return execOutput;

      default:
        return execOutput;
    }
  }
});
