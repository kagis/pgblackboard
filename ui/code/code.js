import { editor } from '../_lib/monaco.js';

export default {
  template: /*html*/ `<div class="code"></div>`,
  computed: {
    model_uri: vm => vm.$store.curr_draft?.id,
    loading: vm => vm.$store.curr_draft?.loading || false,
    error_pos: vm => vm.$store.out.error_pos,
    // light_theme: vm => vm.$store.light_theme,
    set_code_cursor: vm => vm.$store.set_code_cursor.bind(vm.$store),
    save_curr_draft: vm => vm.$store.save_curr_draft.bind(vm.$store),
  },
  methods: {
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
        renderLineHighlight: 'none',
        useShadowDOM: true,
        overviewRulerLanes: 0,
        // bracketPairColorization: { enabled: false },
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
        _ => this.model_uri,
        this.watch_model_uri,
        { immediate: true },
      );

      this.$watch(
        _ => this.loading,
        readOnly => this._editor.updateOptions({ readOnly }),
        { immediate: true },
      );

      this.$watch(
        _ => this.error_pos,
        this.watch_error_pos,
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
      model.updateOptions({ bracketColorizationOptions: { enabled: false } });
      this._editor.setModel(model);
    },

    on_change_selection({ selection, secondarySelections }) {
      if (secondarySelections.length) {
        // TODO set no selection?
      }
      const model = this._editor.getModel();
      const cursor_pos = model.getOffsetAt(selection.getPosition());
      const cursor_end = model.getOffsetAt(selection.getSelectionStart());
      this.set_code_cursor(cursor_pos, cursor_end - cursor_pos);
    },
    on_change_content() {
      if (!this.loading) {
        this.save_curr_draft();
      }
    },
    watch_error_pos(error_pos) {
      this._decorations.set(
        [error_pos]
        .filter(it => Number.isInteger(it))
        .map(it => this._editor.getModel().getPositionAt(it))
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
  },
  mounted() {
    return this._mounted();
  },
  unmounted() {
    return this._unmounted();
  },
};
