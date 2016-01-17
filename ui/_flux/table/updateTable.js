'use strict';

define(function (require, exports, module) {
  module.exports = updateTable;

  function updateTable(params) {
    return function (dispatch) {
      dispatch({
        type: 'REQUEST_UPDATE_ROW',
        rowsetIndex: params.rowsetIndex,
        rowIndex: params.rowIndex,
        values: params.values,
      });

      const xhr = new XMLHttpRequest();
      xhr.open('PATCH', '/' + ['tables'].concat(params.tablePath)
                                  .map(encodeURIComponent)
                                  .join('/'));

      xhr.send(JSON.stringify({
        action: 'Update',
        key: params.key,
        changes: params.changes,
      }));
    };
  }
});
