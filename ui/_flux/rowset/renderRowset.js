'use strict';

csslink('./rowset.css');

define(function (require, exports, module) {
  const el = require('core/el');

  module.exports = renderRowset;

  function renderRowset(rowset) {
    return el('table.rowset'
      ,el('thead'
        ,el('tr'
          ,el('th.rowset__corner')
          ,rowset.fields.map(field => el('th.rowset__colheader'
            ,el('div', field.name)
            ,el('div.rowset__coltype', field.typ)
          ))
        )
      )
      ,el('tbody'
        ,rowset.rows.map(row => el('tr'
          ,el('td.rowset__rowheader')
          ,row.map((val, fieldIndex) => el('td.rowset__cell'
            ,rowset.fields[fieldIndex]['is_num'] && el.class('rowset__cell--num')
            ,val === '' && el.class('rowset__cell--emptystr')
            ,val
          ))
        ))
      )
    );
  }
});
