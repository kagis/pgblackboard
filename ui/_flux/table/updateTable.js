'use strict';

define(function (require, exports, module) {
  module.exports = updateTable;

  function updateTable({
    rowsetIndex,
    rowIndex,
    values,
    changes,
    tablePath,
    key,
  }) {
    return function (dispatch) {
      dispatch({
        type: 'REQUEST_UPDATE_ROW',
        rowsetIndex,
        rowIndex,
        values,
      });

      // const xhr = new XMLHttpRequest();
      // xhr.addEventListener('load', _ => dispatch({
      //   type: 'UPDATE_ROW',
      //   rowsetIndex,
      //   rowIndex,
      //   rowDict: JSON.parse(xhr.responseText),
      // }));
      // xhr.open('PATCH', '/' + ['tables'].concat(tablePath)
      //                             .map(encodeURIComponent)
      //                             .join('/'));
      //
      // xhr.send(JSON.stringify({
      //   action: 'Update',
      //   key,
      //   changes,
      // }));
    };
  }
});
