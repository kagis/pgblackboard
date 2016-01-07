define(function (require, exports, module) {
  var createHub = require('core/hub');
  var dispatchHub = createHub();
  module.exports = dispatchHub;

  window.dispatch = dispatchHub;
});
