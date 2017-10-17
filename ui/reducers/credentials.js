define(function (require, exports, module) {
  'use strict';

  module.exports = reduce_credentials;

  function reduce_credentials(credentials, action) {
    switch (action.type) {
      case 'INIT':
        return {
          is_authenticated: false,
          is_authenticating: false,
          error: null,
        };

      case 'LOGIN_START':
        return {
          is_authenticated: false,
          is_authenticating: true,
          error: null,
        };

      case 'LOGIN_SUCCESS':
        return {
          is_authenticated: true,
          is_authenticating: false,
          user: action.user,
          password: action.password,
          error: null,
        };

      case 'LOGIN_FAIL':
        return {
          is_authenticating: false,
          is_authenticated: false,
          error: action.error,
        };

      default:
        return credentials;
    }
  };
});
