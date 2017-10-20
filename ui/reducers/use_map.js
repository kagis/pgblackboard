export default function use_map(state = false, action) {
  switch (action.type) {
    case 'INIT':
    case 'TREENODE_DEFINITION_LOADED':
    case 'DRAFTS_SELECT':
      return false;

    case 'EXEC':
      return action.use_map;

    default:
      return state;
  }
};
