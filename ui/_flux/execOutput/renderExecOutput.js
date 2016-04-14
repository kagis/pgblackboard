'use strict';

csslink('./execOutput.css')

define(function (require, exports, module) {
  const el = require('core/el')
  const renderMessage = require('./message/renderMessage')
  const renderTable = require('table/renderTable')
  const renderQueryPlan = require('queryPlan/renderQueryPlan')
  const renderMap = require('map/renderMap')
  const memoizeLast = require('core/memoizeLast')
  const saveChanges = require('table/saveChanges')
  const dispatch = require('core/dispatch')

  module.exports = renderExecOutput;

  function renderExecOutput(execOutput) {
    if (!execOutput.items) {
      return null;
    }

    return {
      key: execOutput.useMap ? 'map' : 'sheet',
      children: execOutput.useMap ? renderMap(execOutput) : renderSheet(execOutput)
    };
  }

  function renderSheet(execOutput) {
    return el('div.execOutput'
      ,el('div.execOutput__scrollContainer'
        ,execOutput.items.map(renderStatementResult)
      )

      ,el('div.execOutput__cornerBar'
        ,el('button.execOutput__saveChanges'
          ,el.on('click', _ => dispatch(saveChanges(execOutput)))
          ,'save changes'
        )
      )

    );
  }

  function renderStatementResult(result, index) {
    return el('div.statementResult'
      ,result.errorMessage && el('div.message.message--error'
        ,result.errorMessage
      )
      ,result.fields && result.fields.length && renderTable(result, index)
      ,result.commandTag && el('div.message'
        ,result.commandTag
      )
    )
  }



});
