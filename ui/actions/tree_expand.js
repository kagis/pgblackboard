define(function (require, exports, module) {
  'use strict';
  const treenode_children = require('../api/treenode_children');
  
  module.exports = ({ treenode_path, treenode_id }) => (dispatch, state) => {
    dispatch({
      type: 'TREENODE_EXPAND_START',
      treenode_path,
      treenode_id,
    });
    treenode_children({
      treenode_id,
      credentials: state.credentials
    }).then(children => dispatch({
      type: 'TREENODE_EXPAND_COMPLETE',
      treenode_path,
      treenode_id,
      children,
    }));
  };
});
