import el from '../core/el.js';
import dispatch from '../core/dispatch.js';
import { execute_script, cancel_script } from '../actions/execute_script.js';

export default ({ is_executing }) => el('div.execbar'

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
      ,el.on('click', () => dispatch(cancel_script()))
      ,'cancel..'
    )
  )

);
