// TODO drafts hover preview

const methods = {
  _render() {
    const { curr_draft_id, stored_draft_ids, drafts_kv } = this.$store;
    return {
      tag: 'div',
      class: 'drafts',
      inner: stored_draft_ids.map(draft_id => ({
        tag: 'div',
        class: 'drafts-item',
        key: draft_id,
        'data-selected': draft_id == curr_draft_id || null,
        onClick: _ => this.set_curr_draft(draft_id),
        inner: [
          {
            tag: 'span',
            class: 'drafts-marker',
            // TODO aria
          },
          {
            tag: 'span',
            class: 'drafts-caption',
            inner: drafts_kv[draft_id].caption,
          },
          {
            tag: 'button',
            class: 'drafts-delete',
            type: 'button',
            'aria-label': 'Delete draft',
            onClick: e => this.on_rm_click(e, draft_id),
          },
        ],
      })),
    };
  },
  set_curr_draft(draft_id) {
    this.$store.set_curr_draft(draft_id);
  },
  /** @param {MouseEvent} e */
  on_rm_click(e, draft_id, button_el) {
    e.stopPropagation();
    this.$store.rm_draft(draft_id);
    // console.log('focused', document.activeElement == button_el);
  },
};

export default {
  methods,
};
