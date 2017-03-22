define(function (require, exports, module) {
  const myQueriesRepo = require('myQueries/myQueriesRepo');

  module.exports = addMyQuery;

  function addMyQuery(content) {
    return function (dispatch) {
      const newMyQuery = myQueriesRepo.create(content);

      dispatch({
        type: 'ADD_MYQUERY',
        myQuery: newMyQuery,
      });
    };
  }
});
