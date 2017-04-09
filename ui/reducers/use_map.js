define(function (require, exports, module) {
  'use strict';

  module.exports = use_map;
  
  function use_map(state, action) {
    switch (action.type) {
      case 'INIT':
      case 'TREENODE_DEFINITION_LOADED':
      case 'DRAFTS_SELECT':
        return false;
        
      case 'EXEC':
        return action.use_map;
        
      default:
        return state;
    }
  }
});
