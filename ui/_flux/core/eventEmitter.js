'use strict';

define(function (require, exports, module) {
  module.exports = createEventEmitter;

  class EventEmitter {
    constructor() {
      this._listenersByEventType = Object.create(null);
    }

    on(eventType, listener) {
      (this._listenersByEventType[eventType] || (this._listenersByEventType[eventType] = [])).push(listener);
    }

    emit(eventType, arg) {
      for (let listener of (this._listenersByEventType[eventType] || [])) {
        listener(arg);
      }
    }
  }

  function createEventEmitter() {
    return new EventEmitter();
  }
});
