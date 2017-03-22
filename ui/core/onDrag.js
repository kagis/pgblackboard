'use strict';

define(function (require, exports, module) {
  const el = require('core/el');

  module.exports = onDrag;

  function onDrag(dragStartHandler) {
    return el.on('mousedown', function (mouseDownEvent) {
      // proceed only for left mouse button
      if (mouseDownEvent.button != 0) { return; }

      const draggingEl = this;
      const doc = draggingEl.ownerDocument;
      const dragAndDragEndHandlers = dragStartHandler.call(this, mouseDownEvent);

      doc.addEventListener('mousemove', dragAndDragEndHandlers.handleDrag);
      doc.addEventListener('mouseup', handleMouseUp);
      mouseDownEvent.preventDefault(); // disable text selection
      if (typeof draggingEl.setCapture == 'function') {
        draggingEl.setCapture();
      }

      function handleMouseUp(mouseMoveEvent) {
        doc.removeEventListener('mousemove', dragAndDragEndHandlers.handleDrag);
        doc.removeEventListener('mouseup', handleMouseUp);
        if (typeof draggingEl.releaseCapture == 'function') {
          draggingEl.releaseCapture();
        }
        dragAndDragEndHandlers.handleDragEnd.call(this, mouseMoveEvent);
      }
    })
  }
});
