'use strict';

define(function (require, exports, module) {
  const merge = require('core/merge');

  module.exports = reduceMyQueries;

  function reduceMyQueries(myQueries, action) {
    switch (action.type) {
      case 'INIT':
        return {};

      case 'LOAD_MYQUERIES':
        return action.myQueries;

      case 'ADD_MYQUERY':
        return merge(myQueries, {
          [action.myQuery.id]: action.myQuery,
        });

      case 'UPDATE_MYQUERY':
        return merge(myQueries, {
          [action.myQueryId]: {
            content: action.content,
          },
        });

      case 'REMOVE_MYQUERY':
        return merge(myQueries, {
          [action.myQueryId]: undefined,
        });

      default:
        return myQueries;
    }
  }


});
