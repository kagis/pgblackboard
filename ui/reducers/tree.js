define(function (require, exports, module) {
  'use strict';
  
  const merge = require('../core/merge');

  module.exports = (tree, action) => {
    switch (action.type) {
      case 'INIT':
        return {
          nodes: [],
          message: {},
        };

      case 'LOGIN_SUCCESS':
        return merge(tree, {
          nodes: action.treenodes
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
          message: {
            treeNodeId: null,
          },
          nodes: nodePatch(action.nodePath, {
            nodes: action.children,
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
  };
  
});
