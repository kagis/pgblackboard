export default (state, action) => {
  switch (action.type) {
    case 'INIT':
      return {
        content: '\\connect postgres\n\nSELECT \'hello \' || current_user;',
      };

    case 'TREENODE_SELECT_START':
      return {
        ...state,
        is_loading: true,
      };

    case 'TREENODE_SELECT_SUCCESS':
      return {
        is_loading: false,
        content: action.content,
      };

    case 'TREENODE_SELECT_ERROR':
      return {
        is_loading: false,
        content: `/* ${action.message} */`,
      };

    case 'DRAFTS_SELECT':
      return { draft_id: action.draft_id };

    case 'DRAFTS_ADD':
      return { draft_id: action.draft.id };

    case 'SELECT_SCRIPT_FRAGMENT':
      return {
        ...state,
        selection_ranges: action.ranges,
      };

    case 'EXEC':
      return {
        ...state,
        errors: [],
      };

    case 'STATEMENT_ERROR':
      return {
        ...state,
        errors: [...state.errors, {
          text: action.message,
          linecol: action.linecol,
        }]
      };

    case 'NAVIGATE_TO_MESSAGE_SOURCE':
      return {
        ...state,
        selection_ranges: [{
          head: { line: action.line, ch: 0 },
          anchor: { line: action.line, ch: 0 }
        }],s
      };

    default:
      return state;
  }
};
