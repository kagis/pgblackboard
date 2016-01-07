define(function (require, exports, module) {
  var dispatch = require('core/dispatch');
  var myQueriesRepo = require('myQueries/myQueriesRepo');

  module.exports = addMyQuery;

  function addMyQuery(content) {
    var newMyQuery = myQueriesRepo.create(content);

    dispatch({
      type: 'ADD_MYQUERY',
      myQuery: newMyQuery,
    });

  }
});
