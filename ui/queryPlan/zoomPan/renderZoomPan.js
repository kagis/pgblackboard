'use strict';

csslink('./zoomPan.css');

define(function (require, exports, module) {
  const el = require('core/el');
  const cito = require('core/cito');
  const onDrag = require('core/onDrag');

  module.exports = renderZoomPan;

  function renderZoomPan(zoomPan) {
    const offsetX = zoomPan.offsetX || 0;
    const offsetY = zoomPan.offsetY || 0;
    const scale = getScale(zoomPan.zoom || 0);

    return el('div.zoomPan'
      ,el.prop('state', zoomPan)
      ,!zoomPan.isPanning && zoomPan.isEnabled && el.on('wheel', handleViewportWheel)
      // ,zoomPan.isEnabled && el.on('mousedown', handleViewportMouseDown)
      ,zoomPan.isEnabled &&onDrag(handleDragStart)
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

  function handleDragStart(e) {
    const virtualNode = this.virtualNode;
    const state = virtualNode.state;
    const dx = e.clientX - state.offsetX || 0;
    const dy = e.clientY - state.offsetY || 0;
    const doc = this.ownerDocument;

    cito.vdom.update(virtualNode, renderZoomPan(Object.assign({}, state, {
      isPanning: true,
    })));

    return { handleDrag, handleDragEnd };

    function handleDrag(e) {
      cito.vdom.update(virtualNode, renderZoomPan(
        Object.assign({}, state, computeExtent(e), {
          isPanning: true,
        })
      ));
    }

    function handleDragEnd(e) {
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
