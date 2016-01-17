'use strict';

define(function (require, exports, module) {
  const myQueriesRepo = require('myQueries/myQueriesRepo');

  module.exports = removeMyQuery;

  function removeMyQuery(id) {
    return function (dispatch) {
      myQueriesRepo.remove(id);

      dispatch({
        type: 'REMOVE_MYQUERY',
        myQueryId: id,
      });
    };
  }
});
