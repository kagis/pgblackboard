import xGrip from '../grip/grip.js';

const xTd = {
  template: /*html*/ `
    <td :data-null="display == null || null"
      :data-dirty="change !== undefined || null"
      v-html="display_html">
    </td>
  `,
  props: {
    row: Object,
    col_idx: Number,
  },
  computed: {
    actual: vm => vm.row.tuple[vm.col_idx],
    change: vm => vm.row.updates[vm.col_idx],
    display: vm => vm.change === undefined ? vm.actual : vm.change,
    display_html: vm => vm.display?.replace(/(?<=^.{256}).+|[<>&\r\n]/sg, html_escape_td),
  },
};

function html_escape_td(x) {
  switch (x) {
    case '&': return '&amp;';
    case '<': return '&lt;';
    case '>': return '&gt;';
    case '\r': return /*html*/ `<em>&bsol;r</em>`;
    case '\n': return /*html*/ `<em>&bsol;n</em>`;
    default: return /*html*/ `<em>&mldr;</em>`;
  }
}

export default {
  template: /*html*/ `
    <div class="out" :data-datum_focused="datum_focused || null">

      <table class="out-table"
        v-for="frame, frame_idx of frames"
        :data-frame_idx="frame_idx">
        <!-- <caption class="out-caption" v-text="frame.status"></caption> -->
        <colgroup>
          <col class="out-col_rowh" />
          <col class="out-col"
            v-for="col, col_idx in frame.cols"
            :data-selected="col_is_selected(frame_idx, col_idx) || null"
            :style="{ width: col.width + 'px' }" />
          <col class="out-col_last" />
        </colgroup>
        <thead class="out-head">
          <tr>
            <th class="out-th_rowh" scope="col">#</th>
            <th class="out-th"
              v-for="col, col_idx in frame.cols"
              :data-key="col.att_key || null"
              :data-selected="col_is_selected(frame_idx, col_idx) || null"
              scope="col">
              <!-- TODO support \n, leading/tailing whitespace in colname  -->
              <span class="out-colh_name" v-text="col.name"></span>
              <span>&nbsp;</span>
              <span class="out-colh_type" v-text="col.type"></span>
              <x-grip class="out-colh_resizer"
                :x="col.width"
                v-on:drag="resize_col(frame_idx, col_idx, $event.x)">
              </x-grip>
            </th>
            <th class="out-th" scope="col"></th>
          </tr>
        </thead>
        <tbody class="out-tbody"
          v-on:click="on_tbody_click($event, frame_idx)"
          v-on:mousedown="on_tbody_mousedown">
          <tr class="out-row"
            v-for="row, row_idx in frame.rows"
            :data-will_delete="row.will_delete || null"
            :data-selected="row_is_selected(frame_idx, row_idx) || null"
            :data-row_idx="row_idx">
            <th class="out-th_rowh" scope="row" v-text="row_idx + 1"></th>
            <x-td class="out-cell"
              v-for="col, col_idx in frame.cols"
              :row="row"
              :col_idx="col_idx"
              :data-selected="cell_is_selected(frame_idx, row_idx, col_idx) || null"
              :data-col_type="col.typeOid"
              :data-col_idx="col_idx">
            </x-td>
            <td class="out-td_last">
              <template v-if="frame_is_updatable(frame_idx)">
                <button class="out-delete_row"
                  type="button"
                  :disabled="row_is_dirty(row)"
                  v-on:click.stop="delete_row(frame_idx, row_idx)"
                  aria-label="Delete row">
                </button>
                <button class="out-revert_row"
                  type="button"
                  :disabled="!row_is_dirty(row)"
                  v-on:click.stop="revert_row(frame_idx, row_idx)"
                  aria-label="Revert row">
                </button>
              </template>
            </td>
          </tr>
          <tr class="out-row out-row--new"
            v-if="frame_is_insertable(frame_idx)"
            :data-selected="row_is_selected(frame_idx, frame.rows.length) || null"
            :data-row_idx="frame.rows.length">
            <th class="out-th_rowh" scope="row">*</th>
            <td class="out-cell"
              v-for="col, col_idx in frame.cols"
              :data-selected="cell_is_selected(frame_idx, frame.rows.length, col_idx) || null"
              :data-col_idx="col_idx">
              &mldr;
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
  components: {
    xGrip,
    xTd,
  },
  mounted() {
    // TODO unlisten
    this.$root.$el.addEventListener('req_row_focus', this.on_row_navigate);
  },
  computed: {
    frames: vm => vm.$store.out.frames,
    messages: vm => vm.$store.out.messages,
    curr_frame_idx: vm => vm.$store.out.curr_frame_idx,
    curr_row_idx: vm => vm.$store.out.curr_row_idx,
    datum_focused: vm => vm.$store.datum_focused,
    // datum_opened: vm => vm.$store.out.datum_opened,
  },
  methods: {
    col_is_selected(frame_idx, col_idx) {
      return (
        // this.datum_opened &&
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
    frame_is_updatable(frame_idx) {
      return this.frames[frame_idx].cols.some(col => col.att_key);
    },
    frame_is_insertable(frame_idx) {
      return this.frames[frame_idx].cols.some(col => col.att_name);
    },
    delete_row(frame_idx, row_idx) {
      this.$store.delete_row(frame_idx, row_idx);
    },
    row_is_dirty(row) {
      return row.will_insert || row.will_delete || Boolean(row.updates.length);
    },
    revert_row(frame_idx, row_idx) {
      this.$store.revert_row(frame_idx, row_idx);
    },
    resize_col(frame_idx, col_idx, width) {
      this.$store.resize_col(frame_idx, col_idx, Math.max(width, 50));
    },
    on_tbody_click(/** @type {MouseEvent} */ e, frame_idx) {
      const { target } = e;
      const tr = target.closest('[data-row_idx]');
      if (!tr) return;
      const row_idx = Number(tr.dataset.row_idx);
      const col_idx = Number(target.closest('[data-col_idx]')?.dataset?.col_idx);
      this.$store.set_curr_rowcol(frame_idx, row_idx, col_idx);
      this.$root.$el.dispatchEvent(new CustomEvent('req_map_navigate', { detail: { frame_idx, row_idx, origin: 'sheet' } }));

      if (e.detail == 2 && Number.isInteger(col_idx)) {
        this.$root.$el.dispatchEvent(new CustomEvent('req_datum_focus'));
        // e.preventDefault();
      }
    },
    on_tbody_mousedown(e) {
      if (e.detail > 1) {
        e.preventDefault();
      }
    },
    on_row_navigate({ detail: { frame_idx, row_idx } }) {
      const tr = this.$el.querySelector(`[data-frame_idx="${frame_idx}"] tr[data-row_idx="${row_idx}"]`);
      tr.scrollIntoView({ block: 'center' });
    },
  },
};
