define(function (require, exports, module) {
  'use strict';
  
  const reduce_combined = require('../core/reduceCombined');

  module.exports = (state, action) => reduce_combined(state, action, {
    is_dark: require('./is_dark'),
    ratio_horizontal: require('./ratio_horizontal'),
    ratio_vertical: require('./ratio_vertical'),
    tree: require('./tree'),
    drafts: require('./drafts'),
    selected_treenode_or_draft: require('./selected_treenode_or_draft'),
    selected_document: require('./selected_document'),
    output: require('./output'),
    credentials: require('./credentials'),
  });
});