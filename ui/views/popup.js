define(function (require, exports, module) {
  'use strict';
  const el = require('../core/el');

  module.exports = bindPopup;

  function bindPopup(params) {
    return el.patch(function (node) {
      // el.addEventListener(node, '$destroyed', );
      el.addEventListener(node, 'mouseenter', handleMouseEnter);
      el.addEventListener(node, 'mouseleave', handleMouseLeave);

      function handleMouseEnter(e) {
        // var popup = getPopup(this.ownerDocument);
        // popup.setContent()
      }

      function handleMouseLeave(e) {

      }

    });
  }

  function renderPopup(popup) {
    return el('div.queryPlanPopup'
      ,el.style('left', popup.x)
      ,el.style('top', popup.y)
      ,popup.content
    );
  }

  function getPopupEl(ownerDocument) {
    return ownerDocument[POPUP_PROP_ON_DOCUMENT] || (
      ownerDocument[POPUP_PROP_ON_DOCUMENT] = createPopupEl(ownerDocument)
    );
  }

  function createPopupEl(ownerDocument) {
    const popupEl = ownerDocument.createElement('div');
    popupEl.className = 'queryplan-popup';
    ownerDocument.body.appendChild(popupEl);
    var popup = new QueryplanPopup(popupEl);
    ownerDocument.addEventListener('zoompan', popup.updatePosition.bind(popup));
    return popup;
  }

});
