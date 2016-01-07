define(function (require, exports, module) {
  module.exports = on;

  function on(selector, eventType, listener) {
    addEventListener(eventType, listenerWrapper);
    function listenerWrapper(e) {
      for (var node = e.target; node; node = node.parentNode) {
        if (node.nodeType == 1 && node.matches(selector)) {
          return listener.call(node, e);
        }
      }
    }
  }
});
