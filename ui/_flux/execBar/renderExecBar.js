csslink('./execBar.css');

define(function (require, exports, module) {
  const el = require('core/el');
  const dispatch = require('core/dispatch');
  var executeScript = require('./executeScript');

  module.exports = renderExecBar;

  function renderExecBar() {
    return el('div.execBar'

      ,el('button.execBar__executeMap'
        ,el.on('click', _ => dispatch(executeScript({
          useMap: true,
        })))
        ,'map'
      )

      ,el('button.execBar__execute'
        ,el.on('click', _ => dispatch(executeScript({
          useMap: false,
        })))
        ,'execute'
      )

    );
  }
});
