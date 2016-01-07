csslink('./codeForm.css');

define(function (require, exports, module) {
  var dispatch = require('core/dispatch');
  var el = require('core/el');
  var renderCodeMirror = require('./codeMirror/renderCodeMirror');
  var renderExecbar = require('./execBar/renderExecBar');
  var renderSpinnerShield = require('./spinnerShield/renderSpinnerShield');
  var updateMyQuery = require('myQueries/updateMyQuery');
  var addMyQuery = require('myQueries/addMyQuery');

  module.exports = renderScriptEditor;

  function renderScriptEditor(script) {
    return el('div.codeForm'

      ,renderSpinnerShield({
        isVisible: script.isLoading
      })

      ,renderCodeMirror({
        doc: script.content,
        isReadOnly: script.isLoading,
        errors: script.errors,
        selectionRanges: script.selectionRanges,
        onChange: handleChange,
        onSelectionChange: handleSelectionChange,
      })

      ,el('div.codeForm__execbar'
        ,renderExecbar()
      )
    );

    function handleChange(content) {
      if (script.myQueryId) {
        updateMyQuery(script.myQueryId, content);
      } else {
        addMyQuery(content);
      }
    }

    function handleSelectionChange(ranges) {
      dispatch({
        type: 'SELECT_SCRIPT_FRAGMENT',
        ranges: ranges,
      });
    }
  }



});
