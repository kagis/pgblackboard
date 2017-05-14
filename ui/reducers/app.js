define(function (require, exports, module) {
  'use strict';
  const reduce_combined = require('../core/reduce_combined');

  module.exports = reduce_app;
  
  function reduce_app(state, action) {
    return reduce_combined(state, action, {
      is_dark: require('./is_dark'),
      split: require('./split'),
      tree: require('./tree'),
      drafts: require('./drafts'),
      selected_treenode_or_draft: require('./selected_treenode_or_draft'),
      selected_document: require('./selected_document'),
      stmt_results: require('./stmt_results'),
      use_map: require('./use_map'),
      errors: require('./errors'),
      edits: require('./edits'),
      credentials: require('./credentials'),
      focused_row: require('./focused_row'),
    });
  }
});