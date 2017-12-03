export default (state, action) => {
  switch (action.type) {
    case 'BACKENDKEY':
      return {
        process_id: action.process_id,
        secret_key: action.secret_key,
      };
    case 'EXEC_COMPLETE':
      return null;
    default:
      return state;
  }
};
