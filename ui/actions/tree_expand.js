define(function (require, exports, module) {
  'use strict';
  
  const treenode_children = require('../api/treenode_children');
  
  module.exports = ({ node_path, treenode_id }) => (dispatch, state) => {
    dispatch({
      type: 'TREENODE_LOAD',
      nodePath: node_path,
    });
    
    treenode_children({
      treenode_id,
      credentials: state.credentials
    }).then(children => dispatch({
      type: 'TREENODE_EXPAND',
      nodePath: node_path,
      children,
    }));

  //   var xhr = new XMLHttpRequest();
  //   xhr.onload = handleLoad;
  //   xhr.open('GET', ['/tree'].concat(nodeId).join('/'));
  //   xhr.send();

  //   function handleLoad() {
  //     var jsonResponse = JSON.parse(xhr.responseText);
  //     if (jsonResponse.length > 0) {
  //       dispatch({
  //         type: 'TREENODE_EXPAND',
  //         nodePath: nodePath,
  //         nodes: jsonResponse
  //       });
  //     } else {
  //       dispatch({
  //         type: 'EXPAND_EMPTY_TREENODE',
  //         nodePath: nodePath
  //       });
  //     }
  //   }
  // };
  };

});
