define(function (require, exports, module) {
  'use strict';
  module.exports = create_event_emitter;

  class EventEmitter {
    constructor() {
      this._listeners_by_event_type = Object.create(null);
    }

    on(event_type, listener) {
      (
        this._listeners_by_event_type[event_type] || 
        (this._listeners_by_event_type[event_type] = [])
      ).push(listener);
    }

    off(event_type, listener) {
      this._listeners_by_event_type[event_type]
        = (this._listeners_by_event_type[event_type] || [])
        .filter(it => it != listener);
    }

    emit(event_type, arg) {
      for (let listener of this._listeners_by_event_type[event_type] || []) {
        listener(arg);
      }
    }
  }

  function create_event_emitter() {
    return new EventEmitter();
  }
});
