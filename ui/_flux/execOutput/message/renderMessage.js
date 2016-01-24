'use strict';

csslink('./message.css');

define(function (require, exports, module) {
  const el = require('core/el');
  const dispatch = require('core/dispatch');

  module.exports = renderMessage;

  function renderMessage(message, resultIndex) {
    return el('div.message'
      ,message.isError && el.class('message--error')
      ,typeof message.line == 'number' && el('a.message__sourceLink'
        ,el.on('click', navigateToSource)
        ,'line '
        ,String(message.line + 1)
      )
      ,String(message.text)
    );

    function navigateToSource() {
      window.codemirror.focus();
      dispatch({
        type: 'NAVIGATE_TO_MESSAGE_SOURCE',
        resultIndex: resultIndex,
        line: message.line,
      });
    }
  }

});
