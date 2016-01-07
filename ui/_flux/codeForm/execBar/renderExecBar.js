csslink('./execBar.css');

define(function (require, exports, module) {
  var el = require('core/el');
  var executeScript = require('exec/executeScript');

  module.exports = renderExecBar;

  function renderExecBar() {
    return el('div.execBar'

      ,el('button.execBar__map'
        ,el.on('click', _ => dispatch({
          type: 'EXEC_MAP'
        }))
        ,'map'
      )

      ,el('button.execBar__table'
        ,el.on('click', executeScript)
        ,'execute'
      )

    );
  }
});
