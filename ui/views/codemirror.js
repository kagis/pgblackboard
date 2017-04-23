define(function (require, exports, module) {
  'use strict';
  const pg_builtins = require('./pg_builtins');
  const pg_keywords = require('./pg_keywords');
  const bus = require('../core/bus');
  const CodeMirror = window.CodeMirror;

  CodeMirror.defineMIME('text/x-pgsql', {
    name: 'sql',
    keywords: pg_keywords,
    builtin: pg_builtins,
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

  module.exports = params => old_node => {
    if (old_node) {
      update_codemirror_if_changed(old_node.codemirror, params);
    } else {
      return {
        tag: 'div',
        attrs: { class: 'codemirrorContainer' },
        events: {
          $created(e) {
            e.virtualNode.codemirror = create_codemirror(e.target, params);
          }
        }
      };
    }
  };

  function create_codemirror(dom_el, params) {
    const codemirror = CodeMirror(dom_el, {
      value: params.value,
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
    
    codemirror._pgbb = {};

    // codemirror.on('change', function (codemirror, e) {
    //   var onChange = codemirror.onChangeCallback;
    //   if (e.origin != 'setValue' && typeof onChange == 'function') {
    //      onChange(codemirror.getValue());
    //   }
    // });

    codemirror.on('beforeSelectionChange', function (codemirror, e) {
      const value = codemirror.getValue('\n');
      const value_has_changed = codemirror._pgbb.latest_value != value;
      codemirror._pgbb.latest_value = value;

      if (typeof codemirror._pgbb.on_change == 'function') {
        codemirror._pgbb.on_change({
          selection_ranges: e.ranges,
          value,
          value_has_changed,
        });
      }
    });

    update_codemirror_if_changed(codemirror, params);
    
    bus.on('rendered:SPLIT_HORIZONTAL', () => codemirror.refresh());
    bus.on('rendered:SPLIT_VERTICAL', () => codemirror.refresh());
    

    window.codemirror = codemirror;
    return codemirror;
  }

  function update_codemirror_if_changed(
    codemirror,
    { value, selection_ranges, errors, on_change }
  ) {
    codemirror._pgbb.on_change = null;
    update_value_if_changed(codemirror, value);
    update_selection_if_changed(codemirror, selection_ranges);
    update_annotations_if_changed(codemirror, errors);
    codemirror._pgbb.on_change = on_change;
  }
  
  function update_value_if_changed(codemirror, value) {
    value = (value || '').replace(/\r\n/g, '\n');
    codemirror._pgbb.latest_value = value;
    if (codemirror.getValue('\n') != value) {
      codemirror.setValue(value);
    }
  }
  
  function update_selection_if_changed(codemirror, selection_ranges) {
    if (
      equatableSelectionRanges(codemirror.listSelections()) !==
      equatableSelectionRanges(selection_ranges || [])
    ) {
      codemirror.setSelections(selection_ranges || []);
    }

    function equatableSelectionRanges(arr) {
      return JSON.stringify(arr.map(it => [
        it.head.line,
        it.head.ch,
        it.anchor.line,
        it.anchor.ch
      ]));
    }
  }
  
  function update_annotations_if_changed(codemirror, annotations) {
    annotations = annotations || [];
    if (JSON.stringify(codemirror._pgbb.annotations) == JSON.stringify(annotations)) {
      return;
    }
    codemirror._pgbb.annotations = annotations;
    codemirror.clearGutter('CodeMirror__annotations-gutter');
    for (let anno of annotations) {
      if (!anno.linecol) {
        break;
      }
      const marker = document.createElement('div');
      marker.className = 'CodeMirror__error-gutter-marker';
      marker.dataset.title = anno.text;
      codemirror.setGutterMarker(
        anno.linecol.line,
        'CodeMirror__annotations-gutter',
        marker
      );
    }
  }

});
