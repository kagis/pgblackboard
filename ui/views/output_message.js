import el from '../core/el.js';
import dispatch from '../core/dispatch.js';

export default renderMessage;

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

