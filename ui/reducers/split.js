define(function (require, exports, module) {
  'use strict';
  
  module.exports = reduce_split;
  
  function reduce_split(state = {
    horizontal: 0.3,
    vertical: 0.5,
  }, action) {
    switch (action.type) {
      case 'SPLIT_HORIZONTAL':
        return Object.assign(state, {
          horizontal: action.ratio,
        });
        
      case 'SPLIT_VERTICAL':
        return Object.assign({}, state, {
          vertical: action.ratio,
        });

      default:
        return state;
    }
  };
  
});