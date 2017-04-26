define(function (require, exports, module) {
  'use strict';
  
  module.exports = (state, action) => {
    switch (action.type) {
      case 'INIT':
        return {};
        
      case 'TREENODE_SELECT_START':
        return { treenode_id: action.treenode_id };
        
      case 'DRAFTS_SELECT':
        return { draft_id: action.draft_id };
        
      case 'DRAFTS_ADD':
        return { draft_id: action.draft.id };
        
      default:
        return state;
    }
  };
  
});
