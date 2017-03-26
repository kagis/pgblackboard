define(function (require, exports, module) {
  'use strict';
  
  module.exports = (is_dark, action) => {
    switch (action.type) {
      case 'INIT':
        return false;
      case 'TOGGLE_THEME':
        return !is_dark;
      default:
        return is_dark;
    }
  };
  
});
