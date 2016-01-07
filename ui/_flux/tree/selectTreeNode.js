define(function (require, exports, module) {
  var dispatch = require('core/dispatch');

  module.exports = selectTreeNode;

  function selectTreeNode(treeNodeId) {
    dispatch({
      type: 'TREENODE_SELECT',
      treeNodeId: treeNodeId
    });

    var xhr = new XMLHttpRequest();
    xhr.onload = _ => dispatch({
      type: 'TREENODE_DEFINITION_LOADED',
      content: JSON.parse(xhr.responseText),
      treeNodeId: treeNodeId
    });
    xhr.open('GET', ['/definitions'].concat(treeNodeId).join('/'));
    xhr.send();
  }

});
