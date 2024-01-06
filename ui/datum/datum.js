import { editor } from '../_lib/monaco.js';

export default {
  template: /*html*/ `<div class="datum"></div>`,
  computed: {
    // curr_datum: vm => vm.$store.curr_datum,
    // curr_frame_idx: vm => vm.$store.out.curr_frame_idx,
    // curr_row_idx: vm => vm.$store.out.curr_row_idx,
    // curr_
  },
  methods: {
    _mounted() {
      this._model = editor.createModel('null', 'json');

      this._editor = editor.create(this.$el, {
        // https://microsoft.github.io/monaco-editor/docs.html#interfaces/editor.IStandaloneEditorConstructionOptions.html
        model: this._model,
        // language: 'sql',
        automaticLayout: true,
        tabSize: 2,
        fontSize: 14,
        lineHeight: 20,
        fontFamily: 'Roboto Mono',
        fontWeight: '400',
        minimap: { enabled: false },
        renderLineHighlight: 'none',
        // bracketPairColorization: { enabled: false },
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

      this.$watch(
        this._get_curr_rowcol,
        this._watch_curr_rowcol,
        { immediate: true },
      );

      // this.$watch(
      //   _ => ({
      //     // theme: this.light_theme ? 'x-datum-light' : 'x-datum-dark',
      //     readOnly: true,
      //   }),
      //   options => this._editor.updateOptions(options),
      //   { immediate: true },
      // );

      // this._editor.onDidChangeModelContent(this.on_change_content);
    },
    _unmounted() {
      this._editor.dispose();
      this._model.dispose();
    },
    _get_curr_rowcol() {
      const frame_idx = this.$store.out.curr_frame_idx;
      const row_idx = this.$store.out.curr_row_idx;
      const col_idx = this.$store.out.frames[frame_idx]?.curr_col_idx;
      return { frame_idx, row_idx, col_idx };
    },
    _get_datum(frame_idx, row_idx, col_idx) {
      if (frame_idx == null || row_idx == null) return undefined;
      const { updates, tuple } = this.$store.out.frames[frame_idx].rows[row_idx];
      const new_val = updates[col_idx];
      if (new_val !== undefined) return new_val;
      return tuple[col_idx];
    },
    _watch_curr_rowcol({ frame_idx, row_idx, col_idx }) {
      const val = this._get_datum(frame_idx, row_idx, col_idx);
      this._model?.dispose();
      this._model = editor.createModel(val || '', 'json');
      this._model.updateOptions({ bracketColorizationOptions: { enabled: false } });
      this._model.onDidChangeContent(this._on_change_content);
      this._editor.setModel(this._model);
    },
    _on_change_content() {
      this.$store.edit_datum(
        this.$store.out.curr_frame_idx,
        this.$store.out.curr_row_idx,
        this.$store.out.frames[this.$store.out.curr_frame_idx].curr_col_idx,
        this._model.getValue(),
      );
    },
  },
  mounted() {
    return this._mounted();
  },
  unmounted() {
    return this._unmounted();
  },
};
