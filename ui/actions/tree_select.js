define(function (require, exports, module) {
  'use strict';
  const treenode_definition = require('../api/treenode_definition');
  
  module.exports = treenode_id => (dispatch, state) => {
    dispatch({
      type: 'TREENODE_SELECT_START',
      treenode_id,
    });
    treenode_definition({
      treenode_id,
      credentials: state.credentials,
    }).then(content => dispatch({
      type: 'TREENODE_SELECT_SUCCESS',
      content,
      treenode_id,
    })).catch(({ message }) => dispatch({
      type: 'TREENODE_SELECT_ERROR',
      message,
    }));
  };
});
