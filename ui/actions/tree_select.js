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
      credentials: state.credentials,
    }).then(content => dispatch({
      type: 'TREENODE_DEFINITION_LOADED',
      content,
      treenode_id,
    }));
  };
});
