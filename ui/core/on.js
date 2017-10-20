export default function on(selector, event_type, listener) {
  addEventListener(event_type, listenerWrapper, true);
  function listenerWrapper(e) {
    for (var node = e.target; node; node = node.parentNode) {
      if (node.nodeType == 1 && node.matches(selector)) {
        return listener.call(node, e);
      }
    }
  }
}
