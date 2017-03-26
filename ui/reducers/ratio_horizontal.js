define(function (require, exports, module) {
  'use strict';
  
  module.exports = (prev_ratio = 0.3, action) => {
    switch (action.type) {
      case 'INIT':
        return 0.3;
      case 'SPLIT_HORIZONTAL':
        return action.ratio;
      default:
        return prev_ratio;
    }
  };
  
});