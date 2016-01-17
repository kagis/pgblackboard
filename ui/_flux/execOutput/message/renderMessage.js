'use strict';

csslink('./message.css');

define(function (require, exports, module) {
  const el = require('core/el');
  const dispatch = require('core/dispatch');

  module.exports = renderMessage;

  function renderMessage(message, resultIndex) {
    return el('div.message'
      ,el.on('click', handleClick)
      ,message.isError && el.class('message--error')
      ,String(message.text)
    );

    function handleClick() {
      window.codemirror.focus();
      dispatch({
        type: 'NAVIGATE_TO_MESSAGE_SOURCE',
        resultIndex: resultIndex,
        line: message.line,
      });
    }
  }

});
