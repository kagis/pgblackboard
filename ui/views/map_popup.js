define(function (require, exports, module) {
  'use strict';
  const el = require('../core/el');

  module.exports = render_map_popup;

  function render_map_popup(props) {
    return el('table.map_popup'
      ,props.map(({ name, value }) => (
        el('tr'
          ,el('td.map_popup-prop_name', name)
          ,el('td.map_popup-prop_value', value)
        ))
      )
    );
  }
});
