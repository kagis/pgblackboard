'use strict';

csslink('./edge.css');

define(function (require, exports, module) {
  const el = require('core/el');

  module.exports = renderQueryPlanEdge;

  function renderQueryPlanEdge(edge) {
    return el('path.queryPlanEdge'
      ,el.attr('d', edge.pathData)
    );
  }

});
