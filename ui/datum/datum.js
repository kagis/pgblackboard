import { EditorState } from 'https://esm.sh/@codemirror/state@6.3.2?dev';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, drawSelection } from 'https://esm.sh/@codemirror/view@6.22.1?dev';
import { defaultKeymap, history, historyKeymap, indentWithTab } from 'https://esm.sh/@codemirror/commands@6.3.2?dev';
import { closeBrackets, closeBracketsKeymap } from 'https://esm.sh/@codemirror/autocomplete@6.11.1?dev';
import { highlightSelectionMatches, searchKeymap } from 'https://esm.sh/@codemirror/search@6.5.5?dev';
import { syntaxHighlighting, HighlightStyle, bracketMatching } from 'https://esm.sh/@codemirror/language@6.9.3?dev';
import { json as lang_json } from 'https://esm.sh/@codemirror/lang-json@6.0.1?dev';
import { tags } from 'https://esm.sh/@lezer/highlight@1.2.0?dev';

export default {
  template: /*html*/ `<div class="datum"></div>`,
  mounted() {
    this._mounted();
  },
  computed: {
    selected_datum: vm => vm.$store.selected_datum,
  },
  methods: {
    _mounted() {
      this._cm = new EditorView({ parent: this.$el });

      this.$watch(
        _ => this.selected_datum,
        doc => this.init_state({ doc }),
      );
    },
    init_state({ doc }) {
      const extensions = [
        // EditorState.readOnly.of(readonly),
        [EditorView.lineWrapping].filter(_ => this.line_wrapping),
        EditorView.lineWrapping,
        EditorView.updateListener.of(this.on_change),
        history(),
        // lineNumbers(),
        // highlightActiveLineGutter(),
        drawSelection(),
        EditorState.allowMultipleSelections.of(true),
        closeBrackets(),
        bracketMatching(),
        highlightSelectionMatches(),
        syntaxHighlighting(hl_style),
        lang_json(),

        keymap.of(historyKeymap),
        keymap.of(defaultKeymap),
        keymap.of(closeBracketsKeymap),
        keymap.of(searchKeymap),
        keymap.of(indentWithTab),
      ];

      this._cm.setState(EditorState.create({ doc, extensions }));
      // TODO this.update_error()
    },
    // https://codemirror.net/docs/ref/#view.ViewUpdate
    on_change({ docChanged, selectionSet, focusChanged, view, state }) {
      if (docChanged) {
        const { doc } = state;
        // this.$store.edit_code(doc);
      }
    },
  },
};

const hl_style = HighlightStyle.define([
  { tag: tags.keyword, color: 'var(--cm-keyword)' },
  { tag: tags.string, color: 'var(--cm-literalstr)' },
  { tag: tags.number, color: 'var(--cm-literalnum)' },
  { tag: tags.comment, color: 'var(--cm-comment)' },
  // { tag: [tags.name, tags.deleted, tags.character, tags.propertyName, tags.macroName],
  //     color: coral },
  // { tag: [/*@__PURE__*/tags.function(tags.variableName), tags.labelName],
  //     color: malibu },
  // { tag: [tags.color, /*@__PURE__*/tags.constant(tags.name), /*@__PURE__*/tags.standard(tags.name)],
  //     color: whiskey },
  // { tag: [/*@__PURE__*/tags.definition(tags.name), tags.separator],
  //     color: ivory },
  // { tag: [tags.typeName, tags.className, tags.number, tags.changed, tags.annotation, tags.modifier, tags.self, tags.namespace],
  //     color: chalky },
  // { tag: [tags.operator, tags.operatorKeyword, tags.url, tags.escape, tags.regexp, tags.link, /*@__PURE__*/tags.special(tags.string)],
  //     color: cyan },
  // { tag: [tags.meta, tags.comment],
  //     color: stone },
  // { tag: tags.strong,
  //     fontWeight: "bold" },
  // { tag: tags.emphasis,
  //     fontStyle: "italic" },
  // { tag: tags.strikethrough,
  //     textDecoration: "line-through" },
  // { tag: tags.link,
  //     color: stone,
  //     textDecoration: "underline" },
  // { tag: tags.heading,
  //     fontWeight: "bold",
  //     color: coral },
  // { tag: [tags.atom, tags.bool, /*@__PURE__*/tags.special(tags.variableName)],
  //     color: whiskey },
  // { tag: [tags.processingInstruction, tags.string, tags.inserted],
  //     color: sage },
  // { tag: tags.invalid,
  //     color: invalid },
]);
