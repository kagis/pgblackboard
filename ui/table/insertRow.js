define(function (require, exports, module) {
  'use strict';

  module.exports = insertRow;

  function insertRow({
    rowsetIndex,
    rowIndex,
    values,
    changes,
    tablePath,
  }) {
    return function (dispatch) {
      dispatch({
        type: 'REQUEST_UPDATE_ROW',
        rowsetIndex,
        rowIndex,
        values,
      });

      const xhr = new XMLHttpRequest();
      xhr.addEventListener('load', _ => dispatch({
        type: 'UPDATE_ROW',
        rowsetIndex,
        rowIndex,
        rowDict: JSON.parse(xhr.responseText),
      }));

      xhr.open('PATCH', '/' + ['tables'].concat(tablePath)
                                  .map(encodeURIComponent)
                                  .join('/'));

      xhr.send(JSON.stringify({
        action: 'Insert',
        key: {},
        changes,
      }));
    };
  }
})
