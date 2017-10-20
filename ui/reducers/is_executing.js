export default (state, action) => {
  switch (action.type) {
    case 'EXEC':
      return true;
    case 'EXEC_COMPLETE':
      return false;
    default:
      return state;
  }
};
