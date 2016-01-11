'use strict';

define(function (require, exports, module) {
  module.exports = reduceExecOutput;

  function reduceExecOutput(execOutput, action) {
    switch (action.type) {
      case 'EXPAND_QUERY_PLAN':
        execOutput.items[action.resultIndex].isFullPageView = true;
        return execOutput;

      case 'COLLAPSE_QUERY_PLAN':
        execOutput.items[action.resultIndex].isFullPageView = false;
        return execOutput;

      case 'MOVE_QUERY_PLAN':
        Object.assign(execOutput.items[action.resultIndex], action.extent);
        return execOutput;

      case 'EXEC':
        return {
          useMap: action.useMap,
          items: [],
        };

      case 'HANDLE_EXEC_RESULT_EVENTS':
        action.events.forEach(function (m) {
          var eventTag = m[0];
          var eventPayload = m[1];
          switch (eventTag) {
            case 'rowset':
              execOutput.items.push({
                resultType: 'ROWSET',
                fields: eventPayload,
                rows: [],
              });
              break;

            case 'r':
              execOutput.items[execOutput.items.length - 1].rows.push(eventPayload);
              break;

            case 'non_query':
            case 'notice':
              execOutput.items.push({
                resultType: 'MESSAGE',
                text: eventPayload,
                line: m[2],
                isError: false,
              });
              break;

            case 'error':
              execOutput.items.push({
                resultType: 'MESSAGE',
                text: eventPayload,
                line: m[2],
                isError: true,
              });
              break;

            case 'query_plan':
              execOutput.items.push({
                resultType: 'QUERY_PLAN',
                rootQueryPlanNode: eventPayload,
                isFullPageView: false,
                offsetX: 0,
                offsetY: 0,
                zoom: 0,
              });
              break;

            default:
              break;
          }
        });
        return execOutput;

      default:
        return execOutput;
    }
  }
});
