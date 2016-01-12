'use strict';

csslink('./codeForm.css');

define(function (require, exports, module) {
  const dispatch = require('core/dispatch');
  const el = require('core/el');
  const renderCodeMirror = require('./codeMirror/renderCodeMirror');
  const renderSpinnerShield = require('./spinnerShield/renderSpinnerShield');
  const renderExecbar = require('execBar/renderExecBar');
  const updateMyQuery = require('myQueries/updateMyQuery');
  const addMyQuery = require('myQueries/addMyQuery');

  module.exports = renderCodeForm;

  function renderCodeForm(script) {
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

      ,el('div.codeForm__execBar'
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
