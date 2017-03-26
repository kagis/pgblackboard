define(function (require, exports, module) {
  'use strict';
  
  module.exports = str => ({
    line: (str.match(/\r?\n/g) || []).length,
    col: str.length - str.lastIndexOf('\n'),
  });
})