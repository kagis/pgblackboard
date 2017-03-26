define(function (require, exports, module) {
  'use strict';
  
  const treenode_definition = require('../api/treenode_definition');
  
  module.exports = treenode_id => (dispatch, state) => {
    dispatch({
      type: 'TREENODE_SELECT',
      treenode_id,
    });
    
    treenode_definition({
      treenode_id,
      user: state.credentials.user,
      password: state.credentials.password,
    }).then(content => dispatch({
      type: 'TREENODE_DEFINITION_LOADED',
      content,
      treeNodeId: treenode_id,
    }));
  };
});
