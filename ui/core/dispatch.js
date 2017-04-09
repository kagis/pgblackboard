define(function (require, exports, module) {
  'use strict';
  const create_event_emitter = require('./event_emitter');

  module.exports = dispatch;

  const event_emitter = create_event_emitter();

  function dispatch(action) {
    event_emitter.emit('action', action);
  }

  dispatch.subscribe = function (listener) {
    event_emitter.on('action', listener);
  };
});
