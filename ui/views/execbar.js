import el from '../core/el.js';
import dispatch from '../core/dispatch.js';
import execute_script from '../actions/execute_script.js';
import execute_cancel from '../actions/execute_cancel.js';

export default ({
  is_executing,
  can_cancel,
  smth_is_selected,
  process_id,
}) => el('div.execbar'

  // ,el('button.execbar-execute.execbar-execute--map'
  //   ,el.on('click', _ => dispatch(execute_script({
  //     use_map: true,
  //   })))
  //   ,'map'
  // )

  ,!is_executing && (
    el('button.execbar-btn.execbar-btn--execute'
      ,el.attr('accesskey', 'x')
      ,el.on('click', _ => dispatch(execute_script()))
      ,'execute'
      // ,smth_is_selected && (
      //   el('span.execbar-btn_subtext', 'selection')
      // )
    )
  )

  ,is_executing && !can_cancel && (
    el('button.execbar-btn'
      ,'waiting.'
    )
  )

  ,is_executing && can_cancel && (
    el('button.execbar-btn'
      ,el.attr('accesskey', 'c')
      ,el.on('click', () => dispatch(execute_cancel()))
      ,'cancel..'
      // ,el('span.execbar-btn_subtext'
      //   ,'process '
      //   ,String(process_id)
      // )

    )
  )

);
