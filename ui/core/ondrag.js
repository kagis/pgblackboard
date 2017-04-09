define(function (require, exports, module) {
  'use strict';
  const el = require('./el');

  module.exports = ondrag;

  function ondrag(drag_start_handler) {
    return el.on('mousedown', function (mouse_down_event) {
      // proceed only for left mouse button
      if (mouse_down_event.button != 0) {
        return;
      }

      const dragging_el = this;
      const doc = dragging_el.ownerDocument;
      const { handle_drag, handle_drag_end } = drag_start_handler.call(this, mouse_down_event);

      doc.addEventListener('mousemove', handle_drag);
      doc.addEventListener('mouseup', handle_mouse_up);
      mouse_down_event.preventDefault(); // disable text selection
      if (typeof dragging_el.setCapture == 'function') {
        dragging_el.setCapture();
      }

      function handle_mouse_up(mouse_move_event) {
        doc.removeEventListener('mousemove', handle_drag);
        doc.removeEventListener('mouseup', handle_mouse_up);
        if (typeof dragging_el.releaseCapture == 'function') {
          dragging_el.releaseCapture();
        }
        handle_drag_end.call(this, mouse_move_event);
      }
    })
  }
});
