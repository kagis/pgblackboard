'use strict';

csslink('./featurePopup.css')

define(function (require, exports, module) {
  const el = require('core/el');

  module.exports = renderPopup;

  function renderPopup(props) {
    return el('table.featurePopup'
      ,props.map(prop => el('tr'
        ,el('td.featurePopup__propName', prop.name)
        ,el('td.featurePopup__propValue', prop.value)
      ))
    );
  }
});
