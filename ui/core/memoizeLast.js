'use strict';

define(function (require, exports, module) {
  module.exports = memoizeLast;

  function memoizeLast(fn) {
    let prevParams;
    let result;
    return function memoizedWrapper(params) {
      if (!(prevParams && objectsAreShallowEqual(params, prevParams))) {
        result = fn(params);
        prevParams = params;
      }
      return result;
    };
  }

  function objectsAreShallowEqual(a, b) {
    if (a !== b) {
      for (let key in a) {
        if (a[key] !== b[key]) {
          return false;
        }
      }
    }
    return true;
  }

});
