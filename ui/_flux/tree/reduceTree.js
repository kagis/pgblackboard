'use strict';

define(function (require, exports, module) {
  const merge = require('core/merge');

  module.exports = reduceTree;

  function reduceTree(tree, action) {
    switch (action.type) {
      case 'INIT':
        return {
          nodes: [],
          message: {},
        };

      case 'LOAD_TREE':
        return merge(tree, {
          nodes: action.nodes
        });

      case 'TREENODE_LOAD':
        return merge(tree, nodePatch(action.nodePath, {
          isBusy: true,
        }));

      case 'EXPAND_EMPTY_TREENODE':
        return merge(tree, {
          message: {
            treeNodeId: getTreeNode(action.nodePath).path,
            text: 'There is no child items yet.',
            isError: false,
          },
          nodes: nodePatch(action.nodePath, {
            nodes: null,
            isBusy: false,
            isExpanded: false,
          }).nodes,
        });

      case 'TREENODE_EXPAND':
        return merge(tree, {
          message: {},
          nodes: nodePatch(action.nodePath, {
            nodes: action.nodes,
            isExpanded: true,
            isBusy: false,
          }).nodes,
        });

      case 'TREENODE_COLLAPSE':
        return merge(tree, nodePatch(action.nodePath, {
          nodes: null,
          isExpanded: false,
          isBusy: false,
        }));

      case 'SHOW_ALL_TREE_NODE_CHILDREN':
        return merge(tree, nodePatch(action.nodePath, {
          showAll: true
        }));

      default:
        return tree;
    }

    function nodePatch(path, patchObj) {
      return path.reduceRight(
        (acc, index) => ({ nodes: { [index]: acc } }),
        patchObj
      );
    }

    function getTreeNode(indexPath) {
      return indexPath.reduce(
        (node, i) => node.nodes[i],
        tree
      );
    }
  }
});
