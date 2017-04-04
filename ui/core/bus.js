define(function (require, exports, module) {
  'use strict';
  const create_event_emitter = require('./event_emitter');
  module.exports = create_event_emitter();
});
