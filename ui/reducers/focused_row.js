export default function reduce_focused_row(state = null, action) {
  switch (action.type) {
    case 'EXEC':
    case 'ROW_FOCUS_CLEAR':
      return null;
    case 'ROW_FOCUS':
      return {
        stmt_index: action.stmt_index,
        row_index: action.row_index,
      };
    case 'ROW_EXPAND':
      return {
        stmt_index: action.stmt_index,
        row_index: action.row_index,
        is_expanded: true,
      };
    default:
      return state;
  }
};
