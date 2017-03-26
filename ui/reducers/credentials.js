define(function (require, exports, module) {
  'use strict';
  
  module.exports = (credentials, action) => {
    switch (action.type) {
      case 'INIT':
        return { is_authenticated: false };
        
      case 'LOGIN_SUCCESS':
        return {
          is_authenticated: true,
          user: action.user,
          password: action.password,
        };
        
      default:
        return credentials;
    }
  };
  
});
