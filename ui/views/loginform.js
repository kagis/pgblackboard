define(function (require, exports, module) {
  'use strict';
  const el = require('../core/el');
  const dispatch = require('../core/dispatch');
  const login = require('../actions/login');

  module.exports = render_loginform;

  function render_loginform({ error, is_authenticating }) {
    let user_input, password_input;

    return (
      el('form.loginform'
        ,el.on('submit', onsubmit)
        ,user_input
        = el('input.loginform-user'
          ,el.attr('placeholder', 'user')
          ,el.attr('type', 'text')
        )
        ,password_input
        = el('input.loginform-password'
          ,el.attr('placeholder', 'password')
          ,el.attr('type', 'password')
        )
        ,el('button.loginform-submit'
          ,el.attr('type', 'submit')
          ,is_authenticating && el.attr('disabled', 'disabled')
          ,'login'
          ,is_authenticating && '...'
        )
        ,error && (
          el('div.loginform-error'
            ,error
          )
        )
      )
    );

    function onsubmit(e) {
      if (!is_authenticating) {
        dispatch(login({
          user: user_input.dom.value,
          password: password_input.dom.value,
        }));
      }
      e.preventDefault();
    }
  }
});
