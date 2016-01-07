'use strict';

csslink('./splitPanel.css');

define(function (require, exports, module) {
  const el = require('core/el');
  const cito = require('core/cito');
  const onDrag = require('core/onDrag');

  exports.renderHorizontalSplitpanel = renderHorizontalSplitpanel;
  exports.renderVerticalSplitpanel = renderVerticalSplitpanel;

  const splitterSize = 6;

  function renderHorizontalSplitpanel(params) {
    const ratio = Math.max(0, Math.min(1, params.ratio));
    let rootNode;

    return el('div.splitPanel.splitPanel--horizontal'
      ,el.patch(node => rootNode = node)
      ,params.isSplitting && el.class('splitPanel--splitting')
      ,el('div.splitPanel__child'
        ,el.style('right', (1 - ratio) * 100 + '%')
        ,el.style('margin-right', splitterSize + 'px')
        ,params.left
      )
      ,el('div.splitPanel__splitter'
        ,el.style('left', ratio > 0 ? '' : '0')
        ,el.style('right', ratio > 0 ? (1 - ratio) * 100 + '%' : '')
        ,el.style('width', splitterSize + 'px')
        ,onDrag(e => handleDragStart({
          rootNode,
          state: params,
          calcRatio: calcHorizontalRatio,
          render: renderHorizontalSplitpanel,
        }))
      )
      ,el('div.splitPanel__child'
        ,el.style('left', ratio > 0 ? ratio * 100 + '%' : splitterSize + 'px')
        ,params.right
      )
    );
  }

  function renderVerticalSplitpanel(params) {
    const ratio = Math.max(0, Math.min(1, params.ratio));
    let rootNode;

    return el('div.splitPanel.splitPanel--vertical'
      ,el.patch(node => rootNode = node)
      ,params.isSplitting && el.class('splitPanel--splitting')
      ,el('div.splitPanel__child'
        ,el.style('bottom', (1 - ratio) * 100 + '%')
        ,el.style('margin-bottom', splitterSize + 'px')
        ,params.top
      )
      ,el('div.splitPanel__splitter'
        ,el.style('top', ratio > 0 ? '' : '0')
        ,el.style('bottom', ratio > 0 ? (1 - ratio) * 100 + '%' : '')
        ,el.style('height', splitterSize + 'px')
        ,onDrag(e => handleDragStart({
          rootNode,
          state: params,
          calcRatio: calcVerticalRatio,
          render: renderVerticalSplitpanel,
        }))
      )
      ,el('div.splitPanel__child'
        ,el.style('top', ratio > 0 ? ratio * 100 + '%' : splitterSize + 'px')
        ,params.bottom
      )
    );
  }

  function handleDragStart(options) {
    const render = options.render;
    const rootNode = options.rootNode;
    const state = options.state;
    const rootBounds = rootNode.dom.getBoundingClientRect();

    return { handleDrag, handleDragEnd };

    function handleDrag(e) {
      rerender({
        isSplitting: true,
        ratio: calcRatio(e),
      });
    }

    function handleDragEnd(e) {
      if (typeof state.onRatioChange == 'function') {
        state.onRatioChange(calcRatio(e));
      }

      rerender({
        isSplitting: false,
        ratio: calcRatio(e),
      });
    }

    function rerender(stateExtender) {
      cito.vdom.update(rootNode, render(
        Object.assign({}, state, stateExtender)
      ));
    }

    function calcRatio(e) {
      return options.calcRatio(e, rootBounds);
    }
  }

  function calcHorizontalRatio(splitterMouseEvent, rootBounds) {
    const splitterX = splitterMouseEvent.clientX - rootBounds.left;
    return splitterX <= splitterSize ? 0 : splitterX / rootBounds.width;
  }

  function calcVerticalRatio(splitterMouseEvent, rootBounds) {
    var splitterY = splitterMouseEvent.clientY - rootBounds.top;
    return splitterY <= splitterSize ? 0 : splitterY / rootBounds.height;
  }

});
