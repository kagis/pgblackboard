define(function (require, exports, module) {
  'use strict';
  
  module.exports = reduce_errors;
  
  function reduce_errors(state = [], action) {
    switch (action.type) {
      case 'EXEC':
      case 'TREENODE_DEFINITION_LOADED':
      case 'DRAFTS_SELECT':
        return [];
        
      case 'EXEC_ERROR':
        return [...state, {
          message: action.message,
          linecol: action.linecol,
        }];
      
      default:
        return state;
    }
  }
})