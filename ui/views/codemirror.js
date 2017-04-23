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
        'CodeMirror-annotations_gutter'
      ],
    });

    const state = Object.assign({ codemirror }, params);
    
    codemirror.on('beforeSelectionChange', function (codemirror, e) {
      const value = codemirror.getValue('\n');
      const value_has_changed = state.value != value;

      if (typeof state.on_change == 'function') {
        state.on_change({
          selection_ranges: e.ranges,
          value,
          value_has_changed,
        });
      }
    });

    update_codemirror_if_changed(state, params);
    
    bus.on('rendered:SPLIT_HORIZONTAL', () => codemirror.refresh());
    bus.on('rendered:SPLIT_VERTICAL', () => codemirror.refresh());
    
    window.codemirror = codemirror;
    return state;
  }

  function update_codemirror_if_changed(
    state,
    { value, selection_ranges, errors, on_change }
  ) {
    value = (value || '').replace(/\r\n/g, '\n');    
    state.on_change = null;
    update_value_if_changed(state.codemirror, value);
    update_selection_if_changed(state.codemirror, selection_ranges);
    update_annotations_if_changed(state.codemirror, state.errors, errors);
    Object.assign(state, {
      value,
      selection_ranges,
      errors,
      on_change,
    });
  }
  
  function update_value_if_changed(codemirror, value) {
    if (codemirror.getValue('\n') != value) {
      codemirror.setValue(value);
    }
  }
  
  function update_selection_if_changed(codemirror, selection_ranges) {
    if (
      equatable_selection_ranges(codemirror.listSelections()) !==
      equatable_selection_ranges(selection_ranges || [])
    ) {
      codemirror.setSelections(selection_ranges || []);
    }

    function equatable_selection_ranges(arr) {
      return JSON.stringify(arr.map(it => [
        it.head.line,
        it.head.ch,
        it.anchor.line,
        it.anchor.ch
      ]));
    }
  }
  
  function update_annotations_if_changed(codemirror, old_annotations, new_annotations) {
    new_annotations = new_annotations || [];
    if (JSON.stringify(old_annotations) == JSON.stringify(new_annotations)) {
      return;
    }
    codemirror.clearGutter('CodeMirror-annotations_gutter');
    for (let anno of new_annotations) {
      if (!anno.linecol) {
        break;
      }
      const marker = document.createElement('div');
      marker.className = 'CodeMirror-error_gutter_marker';
      marker.dataset.title = anno.text;
      codemirror.setGutterMarker(
        anno.linecol.line,
        'CodeMirror-annotations_gutter',
        marker
      );
    }
  }

});
