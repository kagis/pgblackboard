import xGrip from '../grip/grip.js';

const xCell = {
  template: /*html*/ `
    <td :data-null="value == null || null" v-html="html_value"></td>
  `,
  props: {
    row: Object,
    col_idx: Number,
  },
  computed: {
    value() {
      const { updates, tuple } = this.row;
      const new_val = updates[this.col_idx];
      if (new_val !== undefined) return new_val;
      return tuple[this.col_idx];
    },
    html_value() {
      return this.value?.slice(0, 100)?.replace(/[<>&\n]/g, x => {
        switch (x) {
          case '&': return '&amp;';
          case '<': return '&lt;';
          case '>': return '&gt;';
          case '\n': return '<em>\\n</em>';
        }
      });
    },
  },
};

export default {
  template: /*html*/ `
    <div class="out">

      <template v-for="frame, frame_idx of frames">
      <table class="out-table"
        v-if="frame.cols"
        :data-frame_idx="frame_idx">
        <!-- <caption class="out-caption" v-text="frame.status"></caption> -->
        <colgroup>
          <col class="out-col_rowh" />
          <col class="out-col"
            v-for="col, col_idx in frame.cols"
            :data-selected="col_is_selected(frame_idx, col_idx) || null"
            :style="{ width: col.width + 'px' }" />
          <!-- <col class="out-col" /> -->
        </colgroup>
        <thead class="out-head">
          <tr>
            <th class="out-th_rowh" scope="col">#</th>
            <th class="out-th"
              scope="col"
              v-for="col, col_idx in frame.cols"
              :data-selected="col_is_selected(frame_idx, col_idx) || null">
              <!-- TODO support \n, leading/tailing whitespace in colname  -->
              <span class="out-colh_name" v-text="col.name"></span>
              <span>&nbsp;</span>
              <span class="out-colh_type" v-text="col.typeName"></span>
              <x-grip class="out-colh_resizer"
                :x="col.width"
                v-on:drag="resize_col(frame_idx, col_idx, $event.x)">
              </x-grip>
            </th>
            <!-- <th class="out-th" scope="col"></th> -->
          </tr>
        </thead>
        <tbody class="out-tbody"
          v-on:click="on_cell_click(frame_idx, $event.target)">
          <tr class="out-row"
            v-for="row, row_idx in frame.rows"
            :data-row_idx="row_idx"
            :data-dirty="row.dirty"
            :data-selected="row_is_selected(frame_idx, row_idx) || null">
            <th class="out-th_rowh" scope="row" v-text="row_idx + 1"></th>
            <x-cell class="out-cell"
              v-for="col, col_idx in frame.cols"
              :row="row"
              :col_idx="col_idx"
              :data-col_type="col.typeOid"
              :data-col_idx="col_idx"
              :data-selected="cell_is_selected(frame_idx, row_idx, col_idx) || null">
            </x-cell>
          </tr>
        </tbody>
      </table>
      </template>

      <div v-for="frame of frames">
        <div class="out-notice" v-for="n of frame.notices">
          <span v-text="n.severity"></span>
          <span>&nbsp;</span>
          <span v-text="n.message"></span>
          <span>&nbsp;</span>
          <span v-text="n.detail"></span>
        </div>
        <div class="out-status" v-text="frame.status"></div>
      </div>
    </div>
  `,
  components: {
    xGrip,
    xCell,
  },
  mounted() {
    // TODO unlisten
    this.$root.$el.addEventListener('req_row_focus', this.on_row_navigate);
  },
  computed: {
    frames: vm => vm.$store.out.frames,
    curr_frame_idx: vm => vm.$store.out.curr_frame_idx,
    curr_row_idx: vm => vm.$store.out.curr_row_idx,
  },
  methods: {
    col_is_selected(frame_idx, col_idx) {
      return (
        this.curr_frame_idx == frame_idx &&
        this.frames[frame_idx].curr_col_idx == col_idx
      );
    },
    row_is_selected(frame_idx, row_idx) {
      return (
        this.curr_frame_idx == frame_idx &&
        this.curr_row_idx == row_idx
      );
    },
    cell_is_selected(frame_idx, row_idx, col_idx) {
      return (
        this.row_is_selected(frame_idx, row_idx) &&
        this.col_is_selected(frame_idx, col_idx)
      );
    },
    resize_col(frame_idx, col_idx, width) {
      this.$store.resize_col(frame_idx, col_idx, Math.max(width, 50));
    },
    // click_row(frame_idx, row_idx) {
    //   if (this.row_is_selected(frame_idx, row_idx)) return;
    //   this.$store.select_row(frame_idx, row_idx);
    //   this.$root.$el.dispatchEvent(new CustomEvent('req_map_navigate', { detail: { frame_idx, row_idx, origin: 'sheet' } }));
    // },
    on_cell_click(frame_idx, /** @type {HTMLElement} */ target) {
      const tr = target.closest('[data-row_idx]');
      if (!tr) return;
      const row_idx = Number(tr.dataset.row_idx);
      const col_idx = Number(target.closest('[data-col_idx]')?.dataset?.col_idx);
      this.$store.set_curr_rowcol(frame_idx, row_idx, col_idx);
      this.$root.$el.dispatchEvent(new CustomEvent('req_map_navigate', { detail: { frame_idx, row_idx, origin: 'sheet' } }));
    },
    on_row_navigate({ detail: { frame_idx, row_idx } }) {
      const tr = this.$el.querySelector(`[data-frame_idx="${frame_idx}"] tr[data-row_idx="${row_idx}"]`);
      tr.scrollIntoView({ block: 'center' });
    },
  },
};
