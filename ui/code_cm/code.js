// deno bundle --import-map importmap.json code.src.js code.js

// import { EditorState, RangeSet, Compartment } from '@codemirror/state';
// import { EditorView, GutterMarker, lineNumberMarkers, keymap, lineNumbers, gutter, highlightActiveLineGutter, scrollPastEnd, drawSelection } from '@codemirror/view';
// import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
// import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
// import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
// import { syntaxHighlighting, HighlightStyle, bracketMatching } from '@codemirror/language';
// import { sql, PostgreSQL } from '@codemirror/lang-sql';
// import { tags } from '@lezer/highlight';

import { EditorState, RangeSet, Compartment } from 'https://esm.sh/@codemirror/state@6.3.2?dev';
import { EditorView, GutterMarker, lineNumberMarkers, keymap, lineNumbers, highlightActiveLineGutter, drawSelection } from 'https://esm.sh/@codemirror/view@6.22.1?dev';
import { defaultKeymap, history, historyKeymap, indentWithTab } from 'https://esm.sh/@codemirror/commands@6.3.2?dev';
import { closeBrackets, closeBracketsKeymap } from 'https://esm.sh/@codemirror/autocomplete@6.11.1?dev';
import { highlightSelectionMatches, searchKeymap } from 'https://esm.sh/@codemirror/search@6.5.5?dev';
import { syntaxHighlighting, HighlightStyle, bracketMatching } from 'https://esm.sh/@codemirror/language@6.9.3?dev';
import { sql as lang_sql, PostgreSQL } from 'https://esm.sh/@codemirror/lang-sql@6.5.4?dev';
import { tags } from 'https://esm.sh/@lezer/highlight@1.2.0?dev';

export default {
  template: /*html*/ `
    <div class="code"></div>
  `,
  methods: {
    _mounted() {
      this._cm = new EditorView({ parent: this.$el });
      window.debug_cm = this._cm;
      this.$watch(
        _ => [this.$store.code, this.$store.code?.loading],
        this.update_content,
        { immediate: true },
      );
      this.$watch(
        _ => this.$store.code.error_at,
        this.update_error_marker,
        { immediate: true },
      );
    },
    update_content([{ content }, loading]) {
      const extensions = [
        EditorState.readOnly.of(loading),
        EditorView.updateListener.of(this.on_change),
        cm_compartment.of([]),
        history(),
        lineNumbers(),
        highlightActiveLineGutter(),
        drawSelection(),
        EditorState.allowMultipleSelections.of(true),
        closeBrackets(),
        bracketMatching(),
        highlightSelectionMatches(),
        syntaxHighlighting(hl_style),
        lang_sql({ dialect: PostgreSQL }),

        keymap.of(historyKeymap),
        keymap.of(defaultKeymap),
        keymap.of(closeBracketsKeymap),
        keymap.of(searchKeymap),
        keymap.of(indentWithTab),
      ];

      this._cm.setState(EditorState.create({ doc: content, extensions }));
      // TODO this.update_error()
    },
    update_error_marker() {
      this._cm.dispatch({
        effects: cm_compartment.reconfigure(
          lineNumberMarkers.of(RangeSet.of(this.get_error_marker())),
        ),
      });
    },
    get_error_marker() {
      const { error_at } = this.$store.code;
      const { doc } = this._cm.state;
      if (!(
        Number.isFinite(error_at) &&
        0 <= error_at && error_at < doc.length
      )) return [];
      const { from } = doc.lineAt(error_at);
      return [error_marker.range(from)];
    },
    // https://codemirror.net/docs/ref/#view.ViewUpdate
    on_change({ docChanged, selectionSet, focusChanged, view, state }) {
      if (docChanged) {
        const { doc } = state;
        this.$store.edit_code(doc);
      }
      if (selectionSet) {
        const { from, to, head, assoc } = state.selection.main;
        this.$store.set_selection(head, (to - from) * assoc);
      }
      // if (docChanged) {
      //   this.$store.bump_working_draft();
      //   // TODO store Text in store?
      //   // this.$store.set_working_draft_content(content);
      //   // console.log('changed');
      // }
      // if (selectionSet) {
      //   // https://codemirror.net/docs/ref/#state.EditorSelection
      //   const { from, to } = state.selection.main;
      //   this.$store.set_editor_selection(from, to);
      // }
      // if (focusChanged && !view.hasFocus) { // on blur
      //   const content = state.doc.toString();
      //   this.$store.set_working_draft_content(content);
      // }
    },

  },
  mounted() {
    return this._mounted();
  },
};

const cm_compartment = new Compartment();
const error_marker = new class extends GutterMarker {
  // elementClass = 'code-gutter_error';
  toDOM() {
    const el = document.createElement('span');
    el.className = 'code-gutter_error';
    return el;
  }
};

// const debug_gutter = gutter({
//   initialSpacer: () => new AnnotationMarker('init'),
//   lineMarker(view, line, others) {
//     return new AnnotationMarker(JSON.stringify(others));
//   },
// });

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

// const cm_errors = Facet.define({
//   combine: arr => arr.flat(),
// });

// const errors_gutter = gutter({
//   class: 'cm-errors-gutter',
//   initialSpacer: _ => new ErrorMarker('init'),
//   markers({ state }) {
//     return RangeSet.of(v.state.facet(cm_errors).map(({ pos, text }) => {
//       const { from } = state.doc.lineAt(pos);
//       return new ErrorMarker(text).range(from);
//     }));
//   },
// });

// class ErrorMarker extends GutterMarker {
//   elementClass = 'cm-error-marker';
//   constructor(title) {
//     super();
//     this.title = title;
//   }
//   toDOM() {
//     const el = document.createElement('span');
//     el.className = 'cm-error-marker-inner';
//     el.title = this.title;
//     el.textContent = '... x';
//     return el;
//   }
// }

// window.cm_annotations = annotations;



