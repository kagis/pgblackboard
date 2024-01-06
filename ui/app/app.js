import xLogin from '../login/login.js';
import xMap from '../map/map.js';
import xCode from '../code/code.js';
import xOut from '../out/out.js';
import xDrafts from '../drafts/drafts.js';
import xTree from '../tree/tree.js';
import xDatum from '../datum/datum.js';
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
  <x-login class="app-login" v-if="!login_done"></x-login>

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
  </div>

  <div class="app-nav">
    <x-drafts class="app-drafts"></x-drafts>
    <x-tree class="app-tree"></x-tree>
  </div>
  <x-code class="app-code"></x-code>
  <x-out class="app-out"></x-out>
  <x-datum class="app-datum"></x-datum>
  <x-map class="app-map"></x-map>

  <x-grip class="app-split_left" :origin="panes" v-on:drag="resize_left"></x-grip>
  <x-grip class="app-split_right" :origin="panes" v-on:drag="resize_right"></x-grip>
  <x-grip class="app-split_out" :origin="panes" v-on:drag="resize_out"></x-grip>
  <x-grip class="app-split_map" :origin="panes" v-on:drag="resize_map"></x-grip>

  <div class="app-measure" ref="measure"></div>
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
    xDrafts,
    xTree,
    xGrip,
    xLogin,
    xDatum,
  },
  computed: {
    light_theme: vm => vm.$store.light_theme,
    can_run: vm => vm.$store.can_run(),
    can_abort: vm => vm.$store.can_abort(),
    login_done: vm => vm.$store.login_done,
    code_selected: vm => vm.$store.curr_draft?.cursor_len,
    panes: vm => vm.$store.panes,
  },
  methods: {
    run() {
      this.$store.run();
    },
    abort() {
      this.$store.abort();
    },
    toggle_theme() {
      this.$store.toggle_theme();
    },
    resize_left({ x, origin }) {
      const wmax = this.$refs.measure.clientWidth;
      let val = origin.left + x / wmax;
      val = Math.min(Math.max(val, 0), 1);
      this.$store.resize_panes({
        left: val,
        right: Math.min(origin.right, 1 - val),
      });
    },
    resize_right({ x, origin }) {
      const wmax = this.$refs.measure.clientWidth;
      let val = origin.right - x / wmax;
      val = Math.min(Math.max(val, 0), 1);
      this.$store.resize_panes({
        right: val,
        left: Math.min(origin.left, 1 - val),
      });
    },
    resize_out({ y, origin }) {
      const hmax = this.$refs.measure.clientHeight;
      let val = origin.out + y / hmax;
      val = Math.min(Math.max(val, 0), 1);
      this.$store.resize_panes({
        out: val,
        map: Math.min(origin.map, 1 - val),
      });
    },
    resize_map({ y, origin }) {
      const hmax = this.$refs.measure.clientHeight;
      let val = origin.map - y / hmax;
      val = Math.min(Math.max(val, 0), 1);
      this.$store.resize_panes({
        map: val,
        out: Math.min(origin.out, 1 - val),
      });
    },
    toggle_map() {
    },
  },
};
