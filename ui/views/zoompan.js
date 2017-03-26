define(function (require, exports, module) {
  'use strict';
  const el = require('core/el');
  const cito = require('core/cito');
  const ondrag = require('core/ondrag');

  module.exports = renderZoomPan;

  function renderZoomPan(zoomPan) {
    const offsetX = zoomPan.offsetX || 0;
    const offsetY = zoomPan.offsetY || 0;
    const scale = getScale(zoomPan.zoom || 0);

    return el('div.zoomPan'
      ,el.prop('state', zoomPan)
      ,!zoomPan.isPanning && zoomPan.isEnabled && el.on('wheel', handleViewportWheel)
      // ,zoomPan.isEnabled && el.on('mousedown', handleViewportMouseDown)
      ,zoomPan.isEnabled &&ondrag(handle_drag_start)
      ,el('div.zoomPan__pane'
        ,!zoomPan.isPanning && el.class('zoomPan__pane--animated')
        ,zoomPan.isEnabled && transform(`translate(${offsetX}px, ${offsetY}px) scale(${scale})`)
        ,el('div.zoomPan__center'
          ,zoomPan.content
        )
      )
    );

    function handleViewportWheel(e) {
      // disable zoom while panning
      // if (zoomPan.isPanning) { return; }

      const zoomInc = (e.deltaY < 0 ? 1 : -1);
      zoomPan.onChange({
        offsetX: zoomPan.offsetX,
        offsetY: zoomPan.offsetY,
        zoom: clampZoom(zoomPan.zoom + zoomInc),
      });
    }
  }

  function handle_drag_start(e) {
    const virtualNode = this.virtualNode;
    const state = virtualNode.state;
    const dx = e.clientX - state.offsetX || 0;
    const dy = e.clientY - state.offsetY || 0;
    const doc = this.ownerDocument;

    cito.vdom.update(virtualNode, renderZoomPan(Object.assign({}, state, {
      isPanning: true,
    })));

    return { handle_drag, handle_drag_end };

    function handle_drag(e) {
      cito.vdom.update(virtualNode, renderZoomPan(
        Object.assign({}, state, computeExtent(e), {
          isPanning: true,
        })
      ));
    }

    function handle_drag_end(e) {
      cito.vdom.update(virtualNode, renderZoomPan(
        Object.assign({}, state, computeExtent(e), {
          isPanning: false,
        })
      ));

      if (typeof state.onChange == 'function') {
        state.onChange(computeExtent(e));
      }
    }

    function computeExtent(mouseEvent) {
      return {
        offsetX: mouseEvent.clientX - dx,
        offsetY: mouseEvent.clientY - dy,
        zoom: state.zoom,
      };
    }
  }

  function clampZoom(zoom) {
    const maxZoom = 5;
    const minZoom = -20;
    return Math.max(minZoom, Math.min(maxZoom, zoom));
  }

  function getScale(zoom) {
    const zoomFactor = .1;
    return Math.exp(zoom * zoomFactor);
  }

  function transform(value) {
    return el.patch(function (node) {
      el.setStyle(node, 'transform', value);
      el.setStyle(node, 'webkitTransform', value);
      el.setStyle(node, 'MozTransform', value);
      el.setStyle(node, 'msTransform', value);
    });
  }
});
