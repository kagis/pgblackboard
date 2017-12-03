import sql_query from '../api/sql_query.js';

export default () => (dispatch, state) => {
  sql_query({
    statements: [`select pg_terminate_backend(${state.backendkey.process_id})`],
    database: 'postgres',
    credentials: state.credentials,
  });
  // if (current_stream) {
  //   current_stream.abort();
  //   current_stream = null;
  // }
  // return {
  //   type: 'EXEC_CANCEL',
  // };
};
