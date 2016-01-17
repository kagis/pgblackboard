'use strict';

define(function (require, exports, module) {
  module.exports = executeScript;

  function executeScript({ useMap }) {
    return function (dispatch, app) {
      dispatch({
        type: 'EXEC',
        useMap: Boolean(useMap),
      });

      const xhr = new XMLHttpRequest();
      // xhr.onload = _ => dispatch({
      //   type: 'EXEC_RESULT',
      //   data: xhr.responseText,
      // });
      xhr.open('POST', '/exec');
      xhr.setRequestHeader('Authorization', 'Basic cG9zdGdyZXM6cG9zdGdyZXM=');
      xhr.send([
        ['sqlscript', getScript()],
      ].map(it => it.map(encodeURIComponent).join('=')).join('&'));

      receiveJsonStream(xhr, function (events) {
        dispatch({
          type: 'HANDLE_EXEC_RESULT_EVENTS',
          events: events,
        });
      });

      function getScript() {
        const selectedDocument = app.selectedDocument;
        const myQueries = app.myQueries;
        return myQueries[selectedDocument.myQueryId] ?
          myQueries[selectedDocument.myQueryId].content :
          selectedDocument.content;
      }

      function getScriptSelection() {
        return app.selectedDocument.selection;
      }
    };
  }




  function receiveJsonStream(xhr, messagesHandler) {
    let offset = 0;

    xhr.addEventListener('readystatechange', function (e) {

      const chunkEndIndex = xhr.responseText.lastIndexOf('\r\n');
      if (chunkEndIndex > offset) {
        const chunk = xhr.responseText.substring(offset, chunkEndIndex);
        const validJsonChunk = wrapChunk(chunk);
        const parsedChunk = JSON.parse(validJsonChunk);
        messagesHandler(parsedChunk);
        offset = chunkEndIndex + 2;
      }

    });
  }

  function wrapChunk(chunk) {
    if (chunk[0] == ',') {
      return '[' + chunk.slice(1) + ']';
    }

    return chunk + ']';
  }

});
