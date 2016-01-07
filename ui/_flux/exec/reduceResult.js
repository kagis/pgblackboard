'use strict';

define(function (require, exports, module) {
  module.exports = reduceResults;

  function reduceResults(results, action) {
    switch (action.type) {
      case 'EXPAND_QUERY_PLAN':
        results[action.resultIndex].isFullPageView = true;
        return results;

      case 'COLLAPSE_QUERY_PLAN':
        results[action.resultIndex].isFullPageView = false;
        return results;

      case 'MOVE_QUERY_PLAN':
        Object.assign(results[action.resultIndex], action.extent);
        return results;

      case 'EXEC':
        return [];

      case 'HANDLE_EXEC_RESULT_EVENTS':
        action.events.forEach(function (m) {
          var eventTag = m[0];
          var eventPayload = m[1];
          switch (eventTag) {
            case 'rowset':
              results.push({
                resultType: 'ROWSET',
                fields: eventPayload,
                rows: [],
              });
              break;

            case 'r':
              results[results.length - 1].rows.push(eventPayload);
              break;

            case 'non_query':
            case 'notice':
              results.push({
                resultType: 'MESSAGE',
                text: eventPayload,
                line: m[2],
                isError: false,
              });
              break;

            case 'error':
              results.push({
                resultType: 'MESSAGE',
                text: eventPayload,
                line: m[2],
                isError: true,
              });
              break;

            case 'query_plan':
              results.push({
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
        return results;

      default:
        return results;
    }
  }
});
