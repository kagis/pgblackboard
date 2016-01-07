define(function (require, exports, module) {
  module.exports = createHub;

  function createHub() {
    return Object.assign(emitEvent, {
      _handlers: [],
      subscribe(handler) {
        emitEvent._handlers.push(handler);
      }
    });

    function emitEvent() {
      emitEvent._handlers.forEach(
        handler => handler.apply(null, arguments)
      );
    }
  }

});
