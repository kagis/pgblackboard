define(function (require, exports, module) {
  'use strict'

  const sqlStream = require('webapi/sqlStream')

  module.exports = executeScript;

  function executeScript({ useMap }) {
    return function (dispatch, app) {
      dispatch({
        type: 'EXEC',
        useMap: Boolean(useMap),
      })

      const stream = sqlStream({
        script: getScript(),
        user: 'postgres',
        password: 'postgres',
        describe: true,
      })

      stream.on('messages', function (messages) {
        while (messages.length) {
          if (Array.isArray(messages[0])) {
            const lastRowIndex = messages.findIndex(it => !Array.isArray(it));
            dispatch({
              type: 'STATEMENT_ROWS',
              rows: messages.splice(0, lastRowIndex < 0 ? messages.length : lastRowIndex),
            })
          } else {
            const m = messages.shift()
            switch (m.messageType) {
              case 'description':
                dispatch({
                  type: 'STATEMENT_DESCRIBE',
                  description: m.payload,
                })
                break

              case 'executing':
                dispatch({
                  type: 'STATEMENT_EXECUTING',
                })
                break

              case 'complete':
                dispatch({
                  type: 'STATEMENT_COMPLETE',
                  commandTag: m.payload,
                })
                break

              case 'error':
                dispatch({
                  type: 'STATEMENT_ERROR',
                  errorMessage: m.payload,
                })
                break
            }
          }
        }
      })

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
    }
  }

})
