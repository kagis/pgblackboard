define(function (require, exports, module) {
  var dispatch = require('core/dispatch');
  var myQueriesRepo = require('myQueries/myQueriesRepo');

  module.exports = updateMyQuery;

  function updateMyQuery(id, content) {
    myQueriesRepo.update(id, content);

    dispatch({
      type: 'UPDATE_MYQUERY',
      myQueryId: id,
      content: content,
    });

  }
});
