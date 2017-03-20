define(function (require, exports, module) {
  module.exports = expandTreeNode;

  function expandTreeNode({ nodePath, nodeId }) {
    return function (dispatch) {
      dispatch({
        type: 'TREENODE_LOAD',
        nodePath: nodePath,
      });

      var xhr = new XMLHttpRequest();
      xhr.onload = handleLoad;
      xhr.open('GET', ['/tree'].concat(nodeId).join('/'));
      xhr.send();

      function handleLoad() {
        var jsonResponse = JSON.parse(xhr.responseText);
        if (jsonResponse.length > 0) {
          dispatch({
            type: 'TREENODE_EXPAND',
            nodePath: nodePath,
            nodes: jsonResponse
          });
        } else {
          dispatch({
            type: 'EXPAND_EMPTY_TREENODE',
            nodePath: nodePath
          });
        }
      }
    };
  }

});
