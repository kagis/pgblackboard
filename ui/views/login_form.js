define(function (require, exports, module) {
  'use strict'
  const el = require('core/el');
  const dispatch = require('core/dispatch');
  const login = require('actions/login');
  
  module.exports = () => {
    let user_input, password_input;
    
    return (
      el('div.loginForm'
        ,user_input = el('input.loginForm__user'
        )
        ,password_input = el('input.loginForm__password'
        )
        ,el('button'
          ,el.attr('type', 'submit')
          ,el.on('click', () => dispatch(login({
            user: user_input.dom.value,
            password: password_input.dom.value,
          })))
          ,'login'
        )
      )
    );
  }
})
