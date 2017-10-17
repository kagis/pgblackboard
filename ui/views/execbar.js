define(function (require, exports, module) {
  'use strict';
  const el = require('../core/el');
  const dispatch = require('../core/dispatch');
  const execute_script = require('../actions/execute_script');

  module.exports = ({ is_executing }) => el('div.execbar'

    // ,el('button.execbar-execute.execbar-execute--map'
    //   ,el.on('click', _ => dispatch(execute_script({
    //     use_map: true,
    //   })))
    //   ,'map'
    // )

    ,!is_executing && (
      el('button.execbar-btn.execbar-btn--execute'
        ,el.attr('accesskey', 'e')
        ,el.on('click', _ => dispatch(execute_script({
          use_map: false,
        })))
        ,'execute'
      )
    )

    ,is_executing && (
      el('button.execbar-btn'
        ,el.on('click', () => dispatch(execute_script.cancel()))
        ,'cancel..'
      )
    )

  );

});
