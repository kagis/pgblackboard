define(function (require, exports, module) {
  'use strict';
  const el = require('../core/el');

  module.exports = renderQueryPlanEdge;

  function renderQueryPlanEdge(edge) {
    return el('path.queryPlanEdge'
      ,el.attr('d', edge.pathData)
    );
  }

});
