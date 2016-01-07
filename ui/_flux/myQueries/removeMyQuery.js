define(function (require, exports, module) {
  var dispatch = require('core/dispatch');
  var myQueriesRepo = require('myQueries/myQueriesRepo');

  module.exports = removeMyQuery;

  function removeMyQuery(id) {
    myQueriesRepo.remove(id);

    dispatch({
      type: 'REMOVE_MYQUERY',
      myQueryId: id,
    });

  }
});
