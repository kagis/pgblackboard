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
        isVisible: script.isLoading,
      })

      ,renderCodeMirror({
        doc: script.content,
        isReadOnly: script.isLoading,
        errors: script.errors,
        selectionRanges: script.selectionRanges,
        onChange: handleChange,
      })

      ,el('div.codeForm__execBar'
        ,renderExecbar()
      )
    );

    function handleChange({ value, selectionRanges, valueHasChanged }) {
      if (valueHasChanged) {
        if (script.myQueryId) {
          dispatch(updateMyQuery(script.myQueryId, value));
        } else {
          dispatch(addMyQuery(value));
        }
      }

      dispatch({
        type: 'SELECT_SCRIPT_FRAGMENT',
        ranges: selectionRanges,
      });
    }

  }
});
