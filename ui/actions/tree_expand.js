import treenode_children from '../api/treenode_children.js';

export default ({ treenode_path, treenode_id }) => (dispatch, state) => {
  dispatch({
    type: 'TREENODE_EXPAND_START',
    treenode_path,
    treenode_id,
  });
  treenode_children({
    treenode_id,
    credentials: state.credentials,
  }).then(children => dispatch({
    type: 'TREENODE_EXPAND_COMPLETE',
    treenode_path,
    treenode_id,
    children,
  })).catch(err => dispatch({
    type: 'TREENODE_EXPAND_ERROR',
    treenode_path,
    treenode_id,
    message: err && err.message || String(e),
  }));
};
