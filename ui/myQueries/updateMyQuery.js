define(function (require, exports, module) {
  const myQueriesRepo = require('myQueries/myQueriesRepo');

  module.exports = updateMyQuery;

  function updateMyQuery(id, content) {
    return function (dispatch) {
      myQueriesRepo.update(id, content);

      dispatch({
        type: 'UPDATE_MYQUERY',
        myQueryId: id,
        content: content,
      });
    };
  }
});
