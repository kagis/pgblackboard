// TODO drafts hover preview

export default {
  template: String.raw /*html*/ `
    <div class="drafts">
      <div class="drafts-item"
        v-for="id in drafts.ids"
        :key="id"
        :data-selected="id == selected_draft_id || null"
        v-on:click="select_draft(id)">
        <span class="drafts-marker" v-on:click.stop="bump(id)"></span>
        <span class="drafts-caption" v-text="get_caption(id)"></span>
        <button class="drafts-delete"
          type="button"
          aria-label="delete"
          v-on:click.stop="delete_draft(id)">
        </button>
      </div>
    </div>
  `,
  computed: {
    selected_draft_id: vm => vm.$store.selected_draft_id,
    drafts: vm => vm.$store.drafts,
  },
  methods: {
    get_caption(draft_id) {
      const content = this.drafts[draft_id];
      return content.slice(0, 100);
    },
    select_draft(draft_id) {
      this.$store.select_draft(draft_id);
    },
    delete_draft(draft_id) {
      this.$store.delete_draft(draft_id);
    },
    bump(id) {
      this.$store.bump_draft(id);
    },
  },
};
