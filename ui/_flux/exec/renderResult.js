'use strict';

define(function (require, exports, module) {
  const el = require('core/el');
  const renderMessage = require('./message/renderMessage');
  const renderRowset = require('rowset/renderRowset');
  const renderQueryPlan = require('queryPlan/renderQueryPlan');

  module.exports = renderResults;

  function renderResults(results) {
    return el('div'
      ,results.map((result, index) => resultRenderersMap[result.resultType](result, index))
    );
  }

  var resultRenderersMap = {
    'ROWSET': renderRowset,
    'MESSAGE': renderMessage,
    'QUERY_PLAN': renderQueryPlan,
  };

});
