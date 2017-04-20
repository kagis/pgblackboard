define(function (require, exports, module) {
  'use strict';
  const el = require('../core/el');
  const dispatch = require('../core/dispatch');
  const execute_script = require('../actions/execute_script');

  module.exports = () => el('div.execbar'

    ,el('button.execbar-execute_map'
      ,el.on('click', _ => dispatch(execute_script({
        use_map: true,
      })))
      ,'map'
    )

    ,el('button.execbar-execute'
      ,el.attr('accesskey', 'e')
      ,el.on('click', _ => dispatch(execute_script({
        use_map: false,
      })))
      ,'execute'
    )

  );
  
});
