import reduce_combined from '../core/reduce_combined.js';
import is_dark from './is_dark.js';
import split from './split.js';
import tree from './tree.js';
import drafts from './drafts.js';
import selected_treenode_or_draft from './selected_treenode_or_draft.js';
import selected_document from './selected_document.js';
import stmt_results from './stmt_results.js';
import map from './map.js';
import errors from './errors.js';
import edits from './edits.js';
import credentials from './credentials.js';
import focused_row from './focused_row.js';
import is_executing from './is_executing.js';
import backendkey from './backendkey.js';

export default (state, action) => reduce_combined(state, action, {
  is_dark,
  split,
  tree,
  drafts,
  selected_treenode_or_draft,
  selected_document,
  stmt_results,
  map,
  errors,
  edits,
  credentials,
  focused_row,
  is_executing,
  backendkey,
});
