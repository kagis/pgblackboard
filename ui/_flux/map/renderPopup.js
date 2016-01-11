'use strict';

define(function (require, exports, module) {
  const el = require('core/el');

  module.exports = renderPopup;

  function renderPopup(props) {
    return el('table.featureProperties'
      Object.keys(props).map(propName => el('tr'
        ,el('td.featureProperties__propName', propName)
        ,el('td.featureProperties__propValue', props[propName])
      ))
    );
  }
});
