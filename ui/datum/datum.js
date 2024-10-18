import { editor } from '../_vendor/monaco.js';

const methods = {
  _render() {
    return { tag: 'div', class: 'datum' };
  },
  _mounted() {
    this._model = editor.createModel('');

    this._editor = editor.create(this.$el, {
      // https://microsoft.github.io/monaco-editor/docs.html#interfaces/editor.IStandaloneEditorConstructionOptions.html
      model: this._model,
      automaticLayout: true,
      tabSize: 2,
      fontSize: 14,
      lineHeight: 20,
      fontFamily: 'Roboto Mono',
      fontWeight: '400',
      minimap: { enabled: false },
      stickyScroll: { enabled: false },
      renderLineHighlight: 'none',
      // https://github.com/microsoft/monaco-editor/issues/3829
      // bracketPairColorization: { enabled: false },
      'bracketPairColorization.enabled': false,
      padding: { top: 8, bottom: 8 },
      lineNumbers: 'off',
      scrollbar: {
        horizontalScrollbarSize: 8,
        verticalScrollbarSize: 8,
        useShadows: false,
      },
      wordWrap: 'on',
      wrappingIndent: 'same',
      unicodeHighlight: { ambiguousCharacters: false },
      unusualLineTerminators: 'off',
    });

    this._editor.onDidFocusEditorText(this._on_focus);
    this._editor.onDidBlurEditorText(this._on_blur);

    window.debug_editor_datum = this._editor;

    this.$watch(
      this._get_curr_rowcol,
      this._watch_curr_rowcol,
      { immediate: true },
    );

    this.$root.$el.addEventListener('req_datum_focus', this._on_req_datum_focus);
  },
  _unmounted() {
    this._editor.dispose();
    this._model.dispose();
  },
  _get_curr_rowcol() {
    const frame_idx = this.$store.out.curr_frame_idx;
    const row_idx = this.$store.out.curr_row_idx;
    const col_idx = this.$store.out.frames[frame_idx]?.curr_col_idx;
    const { type, att_name, att_notnull } = this.$store.out.frames[frame_idx]?.cols?.[col_idx] || 0;
    const updatable = Boolean(att_name);
    return { frame_idx, row_idx, col_idx, type, updatable, att_notnull };
  },
  _get_datum(frame_idx, row_idx, col_idx) {
    // if (frame_idx == null || row_idx == null || row_idx < 0) return undefined;
    const row = this.$store.out.frames[frame_idx]?.rows?.[row_idx];
    if (!row) return undefined;
    const new_val = row.updates[col_idx];
    if (new_val !== undefined) return new_val;
    return row.tuple[col_idx];
  },
  _watch_curr_rowcol({ frame_idx, row_idx, col_idx, updatable, type, att_notnull }) {
    const init_val = this._get_datum(frame_idx, row_idx, col_idx);
    const model = editor.createModel(
      init_val || '',
      this._get_language_of_pgtype(type),
    );

    this._model?.dispose(); // TODO async concurency
    this._model = model;
    this._editor.setModel(this._model);
    this._editor.updateOptions({
      readOnly: !updatable,
      placeholder: init_val == null ? 'NULL' : null,
    });
    // if (typeOid == 3802) {
    //   await this._editor.getAction('editor.action.formatDocument').run();
    // }

    const empty_val = att_notnull ? '' : null; // TODO how to set '' to nullable column?
    model.onDidChangeContent(_ => {
      const new_val = this._model.getValue() || empty_val;
      this.$store.edit_datum(frame_idx, row_idx, col_idx, new_val);
      this._editor.updateOptions({
        placeholder: new_val == null ? 'NULL' : null,
      });
    });
  },
  _on_req_datum_focus() {
    const full_range = this._model.getFullModelRange();
    this._editor.setSelection(full_range);
    this._editor.focus();
  },
  _on_focus() {
    this.$store.sync_datum_focused(true);
  },
  _on_blur() {
    this.$store.sync_datum_focused(false);
  },
  _get_language_of_pgtype(type) {
    if (type == 'json' || type == 'jsonb') return 'json';
    if (type == 'xml') return 'xml';
    return null;
  },
};

export default {
  methods,
};
