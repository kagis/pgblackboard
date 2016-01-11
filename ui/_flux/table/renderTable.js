'use strict';

csslink('./table.css');

define(function (require, exports, module) {
  const el = require('core/el');

  module.exports = renderTable;

  function renderTable(rowset) {
    return el('table.table'
      ,el('thead'
        ,el('tr'
          ,el('th.table__corner')
          ,rowset.fields.map(field => el('th.table__colheader'
            ,el('div', field.name)
            ,el('div.table__coltype', field.typ)
          ))
        )
      )
      ,el('tbody'
        ,rowset.rows.map(row => el('tr'
          ,el('td.table__rowheader')
          ,row.map((val, fieldIndex) => el('td.table__cell'
            ,rowset.fields[fieldIndex]['is_num'] && el.class('table__cell--num')
            ,val === '' && el.class('table__cell--emptystr')
            ,val
          ))
        ))
      )
    );
  }
});
