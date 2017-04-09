define(function (require, exports, module) {
  'use strict';
  const el = require('../core/el');

  module.exports = ({ is_visible }) => el('div.spinnerShield'
    ,is_visible && el.class('spinnerShield--visible')
  );
});
