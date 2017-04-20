define(function (require, exports, module) {
  'use strict';
  const el = require('../core/el');

  module.exports = ({ is_visible }) => el('div.spinner_shield'
    ,is_visible && el.class('spinner_shield--visible')
  );
});
