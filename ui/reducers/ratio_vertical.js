define(function (require, exports, module) {
  'use strict';
  
  module.exports = (prev_ratio = 0.5, action) => {
    switch (action.type) {
      case 'INIT':
        return 0.5;
      case 'SPLIT_VERTICAL':
        return action.ratio;
      default:
        return prev_ratio;
    }
  };
  
});