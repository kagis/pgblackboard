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



      case 'HANDLE_EXEC_RESULT_EVENTS':
        return action.events.reduce(function (execOutput, m) {
          var eventTag = m[0];
          var eventPayload = m[1];
          switch (eventTag) {
            case 'rowset':
              return merge(execOutput, {
                items: merge.push({
                  resultType: 'ROWSET',
                  fields: eventPayload,
                  rows: [],
                  dirtyRows: {},
                }),
              });
              // versioned.push(execOutput, ['items'], {
              //   resultType: 'ROWSET',
              //   fields: eventPayload,
              //   rows: [],
              // });
              // break;

            case 'r':
              return merge(execOutput, {
                items: {
                  [execOutput.items.length - 1]: {
                    rows: merge.push(eventPayload),
                  },
                },
              });
              // versioned.push(execOutput, ['items', lastItemIndex, 'rows'], eventPayload);
              // break;

            case 'non_query':
            case 'notice':
              return merge(execOutput, {
                items: merge.push({
                  resultType: 'MESSAGE',
                  text: eventPayload,
                  line: m[2],
                  isError: false,
                }),
              });
              // versioned.push(execOutput, ['items'], {
              //   resultType: 'MESSAGE',
              //   text: eventPayload,
              //   line: m[2],
              //   isError: false,
              // });
              // break;

            case 'error':
              return merge(execOutput, {
                items: merge.push({
                  resultType: 'MESSAGE',
                  text: eventPayload,
                  line: m[2],
                  isError: true,
                }),
              });
              // versioned.push(execOutput, ['items'], {
              //   resultType: 'MESSAGE',
              //   text: eventPayload,
              //   line: m[2],
              //   isError: true,
              // });
              // break;

            case 'query_plan':
              return merge(execOutput, {
                items: merge.push({
                  resultType: 'QUERY_PLAN',
                  rootQueryPlanNode: eventPayload,
                  isFullPageView: false,
                  offsetX: 0,
                  offsetY: 0,
                  zoom: 0,
                }),
              });
              // versioned.push(execOutput, ['items'], {
              //   resultType: 'QUERY_PLAN',
              //   rootQueryPlanNode: eventPayload,
              //   isFullPageView: false,
              //   offsetX: 0,
              //   offsetY: 0,
              //   zoom: 0,
              // });
              // break;

            default:
              return execOutput;
          }
        }, execOutput);

      case 'ADD_ROW':
        return merge(execOutput, {
          items: {
            [action.rowsetIndex]: {
              newRows: {
                [action.rowIndex]: action.values,
              },
            },
          }
        });


      case 'EDIT_ROW':
        const oldValues = execOutput
          .items[action.rowsetIndex]
          .rows[action.rowIndex];

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
