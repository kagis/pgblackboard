define(function (require, exports, module) {
  'use strict';
  const reduce_combined = require('../core/reduce_combined');

  module.exports = reduce_tree;

  function reduce_tree(state, action) {
    return reduce_combined(state, action, {
      nodes: reduce_nodes,
      message: reduce_message,
    });
  }

  function reduce_nodes(state = [], action) {
    switch (action.type) {
      case 'LOGIN_SUCCESS':
        return action.treenodes;

      case 'TREENODE_EXPAND_START':
      case 'TREENODE_EXPAND_COMPLETE':
      case 'TREENODE_EXPAND_ERROR':
      case 'TREENODE_EXPAND_ALL':
      case 'TREENODE_COLLAPSE': {
        const [treenode_idx] = action.treenode_path;
        return Object.assign([], state, {
          [treenode_idx]: reduce_treenode(
            state[treenode_idx],
            Object.assign({}, action, {
              treenode_path: action.treenode_path.slice(1),
            })
          ),
        });
      }

      default:
        return state;
    }
  }

  function reduce_treenode(state = { children: [] }, action) {

    if (action.treenode_path.length) {
      const [treenode_idx] = action.treenode_path;
      return Object.assign({}, state, {
        children: Object.assign([], state.children, {
          [treenode_idx]: reduce_treenode(
            state.children[treenode_idx],
            Object.assign({}, action, {
              treenode_path: action.treenode_path.slice(1),
            })
          ),
        }),
      });
    }

    switch (action.type) {
      case 'TREENODE_EXPAND_START':
        return Object.assign({}, state, {
          is_busy: true,
        });

      case 'TREENODE_EXPAND_COMPLETE':
        return Object.assign({}, state, {
          children: action.children,
          is_busy: false,
          is_expanded: Boolean(action.children.length),
        });

      case 'TREENODE_COLLAPSE':
      case 'TREENODE_EXPAND_ERROR':
        return Object.assign({}, state, {
          children: [],
          is_expanded: false,
          is_busy: false,
        });

      case 'TREENODE_EXPAND_ALL':
        return Object.assign({}, state, {
          show_all: true
        });

      default:
        return state;
    }
  }

  function reduce_message(state = {}, action) {
    switch (action.type) {
      case 'TREENODE_EXPAND_COMPLETE':
        if (action.children.length) {
          return {};
        }
        return {
          treenode_id: action.treenode_id,
          text: 'no child items',
          is_error: false,
        };

      case 'TREENODE_EXPAND_ERROR':
        return {
          treenode_id: action.treenode_id,
          text: action.message,
          is_error: true,
        };

      default:
        return state;
    }
  }

});
