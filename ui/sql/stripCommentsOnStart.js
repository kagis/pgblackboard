define(function (require, exports, module) {
  'use strict'
  
  module.exports = stripCommentsOnStart
  
  function stripCommentsOnStart(statement) {
    return statement.split(/^(\s|--.*|\/\*[^]*?\*\/)*/)[2]
  }
})