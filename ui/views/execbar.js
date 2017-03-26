define(function (require, exports, module) {
  'use strict';
  const el = require('../core/el');
  const dispatch = require('../core/dispatch');
  const execute_script = require('../actions/execute_script');

  module.exports = () => el('div.execBar'

    ,el('button.execBar__executeMap'
      ,el.on('click', _ => dispatch(execute_script({
        use_map: true,
      })))
      ,'map'
    )

    ,el('button.execBar__execute'
      ,el.on('click', _ => dispatch(execute_script({
        use_map: false,
      })))
      ,'execute'
    )

  );
  
});
