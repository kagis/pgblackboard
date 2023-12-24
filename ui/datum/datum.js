import { editor } from '../_lib/monaco.js';

export default {
  template: /*html*/ `<div class="datum"></div>`,
  computed: {
    curr_datum: vm => vm.$store.curr_datum,
    light_theme: vm => vm.$store.light_theme,
  },
  methods: {
    _mounted() {
      this._model = editor.createModel('', 'json');

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
      });

      this.$watch(
        _ => this.curr_datum,
        this.watch_curr_datum,
        { immediate: true },
      );

      this.$watch(
        _ => ({
          // theme: this.light_theme ? 'x-datum-light' : 'x-datum-dark',
          readOnly: true,
        }),
        options => this._editor.updateOptions(options),
        { immediate: true },
      );

      // this._editor.onDidChangeModelContent(this.on_change_content);
    },
    _unmounted() {
      this._editor.dispose();
    },
    watch_curr_datum(val) {
      this._model.setValue(val || '');
      this._model.updateOptions({ bracketColorizationOptions: { enabled: false } });
      this._editor.revealLine(0);
    },

    // on_change_content() {
    //   if (!this.loading) {
    //     this.save_curr_draft();
    //   }
    // },
  },
  mounted() {
    return this._mounted();
  },
  unmounted() {
    return this._unmounted();
  },
};
