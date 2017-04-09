define(function (require, exports, module) {
  'use strict'
  const el = require('../core/el');
  const dispatch = require('../core/dispatch');
  const login = require('../actions/login');
  
  module.exports = ({ error, is_processing }) => {
    let user_input, password_input;
    
    return (
      el('form.login_form'
        ,el.on('submit', onsubmit)
        ,user_input
        = el('input.login_form__user'
          ,el.attr('placeholder', 'user')
          ,el.attr('type', 'text')
        )
        ,password_input
        = el('input.login_form__password'
          ,el.attr('placeholder', 'password')
          ,el.attr('type', 'password')
        )
        ,el('button.login_form__submit'
          ,el.attr('type', 'submit')
          ,'login'
          ,is_processing && '...'
        )
        ,error && (
          el('div.login_form__error'
            ,error
          )
        )
      )
    );
    
    function onsubmit(e) {
      dispatch(login({
        user: user_input.dom.value,
        password: password_input.dom.value,
      }));
      e.preventDefault();
    }
  }
})
