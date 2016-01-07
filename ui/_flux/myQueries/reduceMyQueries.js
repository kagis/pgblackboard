define(function (require, exports, module) {
  module.exports = reduceMyQueries;

  function reduceMyQueries(myQueries, action) {
    switch (action.type) {
      case 'ADD_MYQUERY':
        return Object.assign({}, myQueries, {
          [action.myQuery.id]: action.myQuery
        });

      case 'UPDATE_MYQUERY':
        myQueries[action.myQueryId].content = action.content;
        return myQueries;

      case 'REMOVE_MYQUERY':
        delete myQueries[action.myQueryId];
        return myQueries;

      default:
        return myQueries;
    }
  }


});
