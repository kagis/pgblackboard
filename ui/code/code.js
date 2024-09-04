import { editor } from '../_lib/monaco.js';

const methods = {
  _render() {
    return { tag: 'div', class: 'code' };
  },
  _mounted() {
    this._editor = editor.create(this.$el, {
      // https://microsoft.github.io/monaco-editor/docs.html#interfaces/editor.IStandaloneEditorConstructionOptions.html
      model: null,
      automaticLayout: true,
      tabSize: 2,
      fontSize: 14,
      lineHeight: 20,
      fontFamily: 'Roboto Mono',
      fontWeight: '400',
      minimap: { enabled: false },
      stickyScroll: { enabled: false },
      renderLineHighlight: 'none',
      useShadowDOM: true,
      overviewRulerLanes: 0,
      // https://github.com/microsoft/monaco-editor/issues/3829
      // bracketPairColorization: { enabled: false },
      'bracketPairColorization.enabled': false,
      padding: { top: 16, bottom: 16 },
      scrollbar: {
        horizontalScrollbarSize: 8,
        verticalScrollbarSize: 8,
        useShadows: false,
      },
    });

    this._decorations = this._editor.createDecorationsCollection();

    window.debug_editor = this._editor;

    this.$watch(
      _ => this.$store.curr_draft?.id,
      this.watch_model_uri,
      { immediate: true },
    );

    this.$watch(
      _ => this.$store.curr_draft?.loading || false,
      readOnly => this._editor.updateOptions({ readOnly }),
      { immediate: true },
    );

    this.$watch(
      _ => this.$store.get_out_errors(),
      this.watch_errors,
      { immediate: true },
    );

    this._editor.onDidChangeCursorSelection(this.on_change_selection);
    this._editor.onDidChangeModelContent(this.on_change_content);
  },
  _unmounted() {
    this._editor.dispose();
  },

  watch_model_uri(uri) {
    if (!uri) return this._editor.setModel(null);
    const model = editor.getModel(uri);
    this._editor.setModel(model);
  },

  on_change_selection({ selection, secondarySelections }) {
    if (secondarySelections.length) {
      // TODO set no selection?
    }
    const model = this._editor.getModel();
    const cursor_pos = model.getOffsetAt(selection.getPosition());
    const cursor_end = model.getOffsetAt(selection.getSelectionStart());
    this.$store.set_code_cursor(cursor_pos, cursor_end - cursor_pos);
  },
  on_change_content() {
    const readonly = this._editor.getOption(editor.EditorOption.readOnly);
    if (!readonly) { // if edited by user
      this.$store.save_curr_draft();
    }
  },
  watch_errors(errors) {
    this._decorations.set(
      errors
      .filter(e => e.position > 0)
      .map(e => this._editor.getModel().getPositionAt(e.position - 1))
      .map(({ lineNumber, column }) => ({
        range: {
          startLineNumber: lineNumber,
          startColumn: column,
          endLineNumber: lineNumber,
          endColumn: column,
        },
        options: {
          isWholeLine: true,
          linesDecorationsClassName: 'code-error_decoration',
        },
      })),
    );
  },
};

export default {
  methods,
};
