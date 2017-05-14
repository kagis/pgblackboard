define(function (require, exports, module) {
  'use strict';
  
  module.exports = reduce_split;
  
  function reduce_split(state = {
    horizontal: 0.3,
    vertical: 0.5,
    output: 1,
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

      case 'SPLIT_OUTPUT':
        return Object.assign({}, state, {
          output: action.ratio,
        });

      case 'MAP_TOGGLE':
        return Object.assign({}, state, {
          output: state.output < 1 ? 1 : 0.5,
        });

      default:
        return state;
    }
  };
  
});