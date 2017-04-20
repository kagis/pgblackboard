define(function (require, exports, module) {
  'use strict';
  const el = require('../core/el');
  const cito = require('../core/cito');
  const ondrag = require('../core/ondrag');

  Object.assign(exports, {
    horizontal_splitpanel,
    vertical_splitpanel,
  });

  const splitter_size = 6;

  function horizontal_splitpanel(params) {
    const ratio = Math.max(0, Math.min(1, params.ratio));
    let root_node;

    return root_node =
    el('div.splitpanel.splitpanel--horizontal'
      ,params.is_splitting && el.class('splitpanel--splitting')
      ,el('div.splitpanel-child'
        ,el.style('right', (1 - ratio) * 100 + '%')
        ,el.style('margin-right', splitter_size + 'px')
        ,params.left
      )
      ,el('div.splitpanel-splitter'
        ,el.style('left', ratio > 0 ? '' : '0')
        ,el.style('right', ratio > 0 ? (1 - ratio) * 100 + '%' : '')
        ,el.style('width', splitter_size + 'px')
        ,ondrag(e => handle_drag_start({
          root_node,
          state: params,
          calc_ratio: calc_horizontal_ratio,
          render: horizontal_splitpanel,
        }))
      )
      ,el('div.splitpanel-child'
        ,el.style('left', ratio > 0 ? ratio * 100 + '%' : splitter_size + 'px')
        ,params.right
      )
    );
  }

  function vertical_splitpanel(params) {
    const ratio = Math.max(0, Math.min(1, params.ratio));
    let root_node;

    return root_node =
    el('div.splitpanel.splitpanel--vertical'
      ,params.is_splitting && el.class('splitpanel--splitting')
      ,el('div.splitpanel-child'
        ,el.style('bottom', (1 - ratio) * 100 + '%')
        ,el.style('margin-bottom', splitter_size + 'px')
        ,params.top
      )
      ,el('div.splitpanel-splitter'
        ,el.style('top', ratio > 0 ? '' : '0')
        ,el.style('bottom', ratio > 0 ? (1 - ratio) * 100 + '%' : '')
        ,el.style('height', splitter_size + 'px')
        ,ondrag(e => handle_drag_start({
          root_node,
          state: params,
          calc_ratio: calc_vertical_ratio,
          render: vertical_splitpanel,
        }))
      )
      ,el('div.splitpanel-child'
        ,el.style('top', ratio > 0 ? ratio * 100 + '%' : splitter_size + 'px')
        ,params.bottom
      )
    );
  }

  function handle_drag_start(options) {
    const render = options.render;
    const root_node = options.root_node;
    const state = options.state;
    const root_bounds = root_node.dom.getBoundingClientRect();

    return { handle_drag, handle_drag_end };

    function handle_drag(e) {
      rerender({
        is_splitting: true,
        ratio: calc_ratio(e),
      });
    }

    function handle_drag_end(e) {
      if (typeof state.on_ratio_change == 'function') {
        state.on_ratio_change(calc_ratio(e));
      }

      rerender({
        is_splitting: false,
        ratio: calc_ratio(e),
      });
    }

    function rerender(state_extender) {
      cito.vdom.update(root_node, render(
        Object.assign({}, state, state_extender)
      ));
    }

    function calc_ratio(e) {
      return options.calc_ratio(e, root_bounds);
    }
  }

  function calc_horizontal_ratio(splitter_mouse_event, root_bounds) {
    const splitter_x = splitter_mouse_event.clientX - root_bounds.left;
    return splitter_x <= splitter_size ? 0 : splitter_x / root_bounds.width;
  }

  function calc_vertical_ratio(splitter_mouse_event, root_bounds) {
    var splitter_y = splitter_mouse_event.clientY - root_bounds.top;
    return splitter_y <= splitter_size ? 0 : splitter_y / root_bounds.height;
  }

});
