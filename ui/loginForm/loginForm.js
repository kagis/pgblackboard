define(function (require, exports, module) {
  'use strict'
  const el = require('core/el')

  Object.assign(exports, {
    renderLoginForm,
  })

  function renderLoginForm() {
    return (
      el('div.loginForm'
        ,el('input.loginForm__username'
        )
        ,el('input.loginForm__password'
        )
        ,el('button'
          ,el.attr('type', 'submit')
        )
      )
    )
  }
})
