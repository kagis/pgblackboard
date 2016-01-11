define(function (require, exports, module) {
  module.exports = reduceTree;

  function reduceTree(tree, action) {
    switch (action.type) {
      case 'TREENODE_LOAD':
        var nodeToLoad = getTreeNode(action.nodePath);
        nodeToLoad.isBusy = true;
        return tree;

      case 'EXPAND_EMPTY_TREENODE':
        var nodeToExpand = getTreeNode(action.nodePath);
        nodeToExpand.childNodes = null;
        nodeToExpand.isBusy = false;
        nodeToExpand.isExpanded = false;
        tree.message = {
          treeNodeId: nodeToExpand.path,
          text: 'There is no child items yet.',
          isError: false,
        };
        return tree;

      case 'TREENODE_EXPAND':
        var nodeToExpand = getTreeNode(action.nodePath);
        nodeToExpand.childNodes = action.childNodes;
        nodeToExpand.isExpanded = true;
        nodeToExpand.isBusy = false;
        tree.message = {};
        return tree;

      case 'TREENODE_COLLAPSE':
        var nodeToCollapse = getTreeNode(action.nodePath);
        nodeToCollapse.isExpanded = false;
        nodeToCollapse.isBusy = false;
        nodeToCollapse.childNodes = null;
        return tree;

      case 'ACCEPT_ROOT_TREE_NODES':
        return Object.assign({}, tree, {
          rootNodes: action.nodes,
        });

      case 'SHOW_ALL_TREE_NODE_CHILDREN':
        var nodeToShowAll = getTreeNode(action.treeNodePath);
        nodeToShowAll.showAll = true;
        return tree;

      default:
        return tree;
    }

    function getTreeNode(indexPath) {
      return indexPath.reduce(
        (node, i) => node.childNodes[i],
        { childNodes: tree.rootNodes }
      );
    }
  }
});
