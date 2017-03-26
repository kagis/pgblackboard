define(function (require, exports, module) {
  'use strict';
  
  module.exports = (credentials, action) => {
    switch (action.type) {
      case 'INIT':
        return { 
          is_authenticated: false,
          is_processing: false,
          error: null,
        };
        
      case 'LOGIN_START':
        return {
          is_authenticated: false,
          is_processing: true,
          error: null,
        };
        
      case 'LOGIN_SUCCESS':
        return {
          is_authenticated: true,
          is_processing: false,
          user: action.user,
          password: action.password,
          error: null,
        };
        
      case 'LOGIN_FAIL':
        return {
          is_processing: false,
          is_authenticated: false,
          error: action.error,
        };
        
      default:
        return credentials;
    }
  };
  
});
