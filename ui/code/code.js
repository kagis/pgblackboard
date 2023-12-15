import { editor } from 'https://esm.sh/v135/monaco-editor@0.45.0/es2022/monaco-editor.development.bundle.mjs';

export default {
  template: /*html*/ `<div class="code"></code>`,
  computed: {

  },
  methods: {
    _mounted() {
      this._monaco = editor.create(this.$el, {
        // https://microsoft.github.io/monaco-editor/docs.html#interfaces/editor.IStandaloneEditorConstructionOptions.html
        automaticLayout: true,
        language: 'sql',
        minimap: { enabled: false },
        renderLineHighlight: false,
        bracketPairColorization: { enabled: false },
        padding: { top: 16, bottom: 16 },
        scrollbar: {
          horizontalScrollbarSize: 8,
          verticalScrollbarSize: 8,
          useShadows: false,
        },
        theme: 'vs-dark',
        value: `select 'hello';`,
      });

      window.debug_monaco = this._monaco;

      // this.$watch(

      // );
    },
    _unmounted() {
      this._monaco.dispose();
    },

  },
  mounted() {
    return this._mounted();
  },
  unmounted() {
    return this._unmounted();
  },
};
