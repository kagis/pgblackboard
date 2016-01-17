'use strict';

define(function (require, exports, module) {
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
