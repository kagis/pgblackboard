// TODO drafts hover preview

export default {
  template: String.raw /*html*/ `
    <div class="drafts">
      <div class="drafts-item"
        v-for="id in stored_draft_ids"
        :key="id"
        :data-selected="id == curr_draft_id || null"
        v-on:click="set_curr_draft(id)">
        <span class="drafts-marker" v-on:click.stop="bump(id)"></span>
        <span class="drafts-caption" v-text="get_caption(id)"></span>
        <button class="drafts-delete"
          type="button"
          aria-label="remove draft"
          xv-on:pointerdown="on_rm_down"
          v-on:click.stop="on_rm_click(id, $event.target)">
        </button>
      </div>
    </div>
  `,
  computed: {
    curr_draft_id: vm => vm.$store.curr_draft_id,
    stored_draft_ids: vm => vm.$store.stored_draft_ids,
    drafts_kv: vm => vm.$store.drafts_kv,
    set_curr_draft: vm => vm.$store.set_curr_draft.bind(vm.$store),
    rm_draft: vm => vm.$store.rm_draft.bind(vm.$store),
  },
  methods: {
    get_caption(draft_id) {
      const { caption } = this.drafts_kv[draft_id];
      return caption;
    },
    on_rm_click(draft_id, button_el) {
      this.rm_draft(draft_id);
      // console.log('focused', document.activeElement == button_el);
    },
  },
};
