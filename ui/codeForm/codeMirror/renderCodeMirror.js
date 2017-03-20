'use strict';

csslink('./codeMirror.css');

define(function (require, exports, module) {

  const pgBuiltins = require('../pgBuiltins');
  const pgKeywords = require('../pgKeywords');

  CodeMirror.defineMIME('text/x-pgsql', {
    name: 'sql',
    keywords: pgKeywords,
    builtin: pgBuiltins,
    atoms: { 'false': 1, 'true': 1, 'null': 1 },
    operatorChars: /^[*+\-%<>!=]/,
    dateSQL: {
      'date': 1,
      'time': 1,
      'timestamp': 1,
      'timestamptz': 1,
      'interval': 1,
    },
    support: {
      'doubleQuote': 1,
      'binaryNumber': 1,
      'hexNumber': 1,
    },
  });

  module.exports = renderCodeMirror;

  /**
   * @param {{
   *   doc: string,
   *   onChange: Function,
   *   onSelectionChange: Function,
   * }} params
   */
  function renderCodeMirror(params) {
    return function nodeFn(oldNode) {
      if (oldNode) {
        updateCodeMirror(oldNode.codemirror, params);
      } else {
        return {
          tag: 'div',
          attrs: { class: 'codemirrorContainer' },
          events: {
            $created: function (e) {
              e.virtualNode.codemirror = createCodeMirror(e.target, params);
            }
          }
        };
      }
    };
  }

  function createCodeMirror(domEl, params) {
    const codemirror = CodeMirror(domEl, {
      value: params.doc || 'initial',
      lineNumbers: true,
      matchBrackets: true,
      showCursorWhenSelecting: true,
      autoCloseBrackets: true,
      autofocus: true,
      mode: 'text/x-pgsql',
      keyMap: 'sublime',
      gutters: [
        'CodeMirror-linenumbers',
        'CodeMirror__annotations-gutter'
      ],
    });

    // codemirror.on('change', function (codemirror, e) {
    //   var onChange = codemirror.onChangeCallback;
    //   if (e.origin != 'setValue' && typeof onChange == 'function') {
    //      onChange(codemirror.getValue());
    //   }
    // });

    codemirror.on('beforeSelectionChange', function (codeMirror, e) {
      const onChange = codemirror.onChangeCallback;
      const newValue = codeMirror.getValue();
      const oldValue = codeMirror.lastValue;
      const valueHasChanged = oldValue != newValue;
      codeMirror.lastValue = newValue;

      if (typeof onChange == 'function' && !codeMirror.settingValue) {
        onChange({
          selectionRanges: e.ranges,
          value: codeMirror.getValue(),
          valueHasChanged,
        });
      }

    });

    updateCodeMirror(codemirror, params);

    window.codemirror = codemirror;
    return codemirror;
  }

  function updateCodeMirror(codeMirror, params) {
    codeMirror.settingValue = true;

    codeMirror.onChangeCallback = params.onChange;

    if (codeMirror.getValue('\n') !== CodeMirror.splitLines(params.doc || '').join('\n')) {
      codeMirror.setValue(params.doc || String(new Date()));
    }

    const oldSelectionRanges = codeMirror.listSelections();
    const newSelectionRanges = params.selectionRanges || [];

    if (equatableSelectionRanges(oldSelectionRanges) !==
      equatableSelectionRanges(newSelectionRanges))
    {
      codeMirror.setSelections(newSelectionRanges);
    }

    function equatableSelectionRanges(arr) {
      return JSON.stringify(arr.map(it => [
        it.head.line,
        it.head.ch,
        it.anchor.line,
        it.anchor.ch
      ]));
    }

    codeMirror.clearGutter('CodeMirror__annotations-gutter');
    if (params.errors) {
      params.errors
        .filter(error => typeof error.line == 'number')
        .forEach(error => {
          const marker = document.createElement('div');
          marker.className = 'CodeMirror__error-gutter-marker';
          marker.dataset.title = error.text;
          codeMirror.setGutterMarker(
            error.line,
            'CodeMirror__annotations-gutter',
            marker
          );
        });
    }

    codeMirror.settingValue = false;
  }

});
