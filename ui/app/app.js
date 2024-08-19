import xAuth from '../auth/auth.js';
import xMap from '../map/map.js';
import xCode from '../code/code.js';
import xOut from '../out/out.js';
// import xTable from '../table/table.js';
import xDrafts from '../drafts/drafts.js';
import xTree from '../tree/tree.js';
import xDatum from '../datum/datum.js';
import xLog from '../log/log.js';
import xGrip from '../grip/grip.js';

const template = String.raw /*html*/ `
<div class="app"
  :class="{ 'light': light_theme }"
  :style="{
    '--app-pane_left': panes.left,
    '--app-pane_right': panes.right,
    '--app-pane_out': panes.out,
    '--app-pane_map': panes.map,
  }">
  <x-auth class="app-auth" v-if="!login_done"></x-auth>

  <div class="app-nav_bar">
    <button class="app-theme_btn"
      type="button"
      aria-label="theme"
      v-on:click="toggle_theme">
    </button>
  </div>

  <div class="app-code_bar">
    <button class="app-run"
      type="button"
      aria-label="run"
      :disabled="!can_run"
      :data-has_selection="!!code_selected || null"
      v-on:click="run">
    </button>
    <button class="app-abort"
      type="button"
      aria-label="abort"
      :disabled="!can_abort"
      v-on:click="abort">
    </button>
    <!-- <button class="app-map_btn"
      type="button"
      aria-label="map"
      v-on:click="toggle_map">
    </button> -->

    <button class="app-dump_changes_btn"
      type="button"
      v-if="changes_num"
      v-on:click="dump_changes">
      <span v-text="changes_num"></span>
      dirty rows
    </button>
  </div>

  <div class="app-nav">
    <x-drafts class="app-drafts"></x-drafts>
    <x-tree class="app-tree"></x-tree>
  </div>
  <x-code class="app-code"></x-code>
  <div class="app-out">
    <!-- <x-table class="app-table"
      v-for="frame_idx of nframes"
      :frame_idx="frame_idx">
    </x-table> -->
    <x-out class="app-tables"></x-out>
    <x-log class="app-log"></x-log>
  </div>
  <x-datum class="app-datum"></x-datum>
  <x-map class="app-map"></x-map>

  <x-grip class="app-split_left" :origin="panes" v-on:drag="resize_left"></x-grip>
  <x-grip class="app-split_right" :origin="panes" v-on:drag="resize_right"></x-grip>
  <x-grip class="app-split_out" :origin="panes" v-on:drag="resize_out"></x-grip>
  <x-grip class="app-split_map" :origin="panes" v-on:drag="resize_map"></x-grip>

  <div class="app-measure" ref="measure" aria-hidden="true"></div>
</div>
`;

export default {
  template,

  // render(arg) {
  //   const { $h } = arg;
  //   return $h('div', {
  //     class: ['app', this.light_theme && 'light'],
  //     style: {
  //       '--app-pane_left': this.panes.left,
  //       '--app-pane_right': this.panes.right,
  //       '--app-pane_out': this.panes.out,
  //       '--app-pane_map': this.panes.map,
  //     },
  //   }, [
  //     this.login_done || $h(xLogin, {
  //       class: 'app-login',
  //     }),

  //     this.login_done && [
  //       $h('div', {
  //         class: 'app-nav_bar',
  //       }, [
  //         $h('button', {
  //           class: 'app-theme_btn',
  //           type: 'button',
  //           'aria-label': 'theme',
  //           onClick: this.toggle_theme,
  //         }),
  //       ]),
  //       $h(xGrip, {
  //         class: 'app-split_left',
  //         origin: this.panes,
  //         onDrag: this.resize_left
  //       }),
  //       $h('div', {
  //         class: 'app-measure',
  //         ref: 'measure',
  //       }),
  //     ],
  //   ]);
  // },

  components: {
    xMap,
    xCode,
    xOut,
    // xTable,
    xDrafts,
    xTree,
    xGrip,
    xAuth,
    xDatum,
    xLog,
  },
  computed: {
    light_theme: vm => vm.$store.light_theme,
    can_run: vm => vm.$store.can_run(),
    can_abort: vm => vm.$store.can_abort(),
    login_done: vm => vm.$store.login_done,
    code_selected: vm => vm.$store.curr_draft?.cursor_len,
    panes: vm => vm.$store.panes,
    changes_num: vm => vm.$store.get_changes_num(),
    nframes: vm => vm.$store.out.frames.length,
  },
  methods: {
    /** @param {MouseEvent} e */
    run(e) {
      // TODO show confirm dialog if .out has unsaved edits
      this.$store.run({ rw: e.altKey });
    },
    abort() {
      this.$store.abort();
    },
    toggle_theme() {
      this.$store.toggle_theme();
    },
    dump_changes() {
      this.$store.dump_changes();
    },
    resize_left({ x, origin }) {
      const wmax = this.$refs.measure.clientWidth;
      const val = origin.left + x / wmax;
      const left = Math.min(Math.max(val, 0), 1);
      const right = Math.min(origin.right, 1 - left);
      this.$store.resize_panes({ left, right });
    },
    resize_right({ x, origin }) {
      const wmax = this.$refs.measure.clientWidth;
      const val = origin.right - x / wmax;
      const right = Math.min(Math.max(val, 0), 1);
      const left = Math.min(origin.left, 1 - right);
      this.$store.resize_panes({ left, right });
    },
    resize_out({ y, origin }) {
      const hmax = this.$refs.measure.clientHeight;
      const val = origin.out + y / hmax;
      const out = Math.min(Math.max(val, 0), 1);
      const map = Math.min(origin.map, 1 - out);
      this.$store.resize_panes({ out, map });
    },
    resize_map({ y, origin }) {
      const hmax = this.$refs.measure.clientHeight;
      const val = origin.map - y / hmax;
      const map = Math.min(Math.max(val, 0), 1);
      const out = Math.min(origin.out, 1 - map);
      this.$store.resize_panes({ out, map });
    },
  },
};
