'use strict';

define(function (require, exports, module) {
  const el = require('core/el');
  const renderMessage = require('./message/renderMessage');
  const renderTable = require('table/renderTable');
  const renderQueryPlan = require('queryPlan/renderQueryPlan');
  const renderMap = require('map/renderMap');
  const memoizeLast = require('core/memoizeLast');

  module.exports = renderExecOutput;

  function renderExecOutput(execOutput) {
    if (!execOutput.items) {
      return null;
    }

    return {
      key: execOutput.useMap ? 'map' : 'sheet',
      children: execOutput.useMap ? renderMap(execOutput) : renderSheet(execOutput)
    };
  }

  function renderSheet(execOutput) {
    return el('div'
      ,execOutput.items.map((result, index) => resultRenderersMap[result.resultType]({ result, index }))
    );
  }

  var resultRenderersMap = {
    'ROWSET': memoizeLast(p => renderTable(p.result, p.index)),
    'MESSAGE': memoizeLast(p => renderMessage(p.result, p.index)),
    'QUERY_PLAN': memoizeLast(p => renderQueryPlan(p.result, p.index)),
  };

});
