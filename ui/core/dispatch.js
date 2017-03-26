define(function (require, exports, module) {
  'use strict';
  const createEventEmitter = require('core/eventEmitter');

  module.exports = dispatch;

  const eventEmitter = createEventEmitter();

  function dispatch(action) {
    eventEmitter.emit('action', action);
  }

  dispatch.subscribe = function (listener) {
    eventEmitter.on('action', listener);
  };
});
