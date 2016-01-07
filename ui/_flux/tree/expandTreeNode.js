define(function (require, exports, module) {
  var dispatch = require('core/dispatch');
  var store = require('store');

  module.exports = expandTreeNode;

  function expandTreeNode(treeNodePath) {
    dispatch({
      type: 'TREENODE_LOAD',
      nodePath: treeNodePath
    });

    var node = treeNodePath.reduce(
      (node, i) => node.childNodes[i],
      { childNodes: store.state.tree.rootNodes }
    );
    var xhr = new XMLHttpRequest();
    xhr.onload = handleLoad;
    xhr.open('GET', ['/tree'].concat(node.path).join('/'));
    xhr.send();

    function handleLoad() {
      var jsonResponse = JSON.parse(xhr.responseText);
      if (jsonResponse.length > 0) {
        dispatch({
          type: 'TREENODE_EXPAND',
          nodePath: treeNodePath,
          childNodes: jsonResponse
        });
      } else {
        dispatch({
          type: 'EXPAND_EMPTY_TREENODE',
          nodePath: treeNodePath
        });
      }
    }
  }

});
