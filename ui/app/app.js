import xLogin from '../login/login.js';
import xMap from '../map/map.js';
import xCode from '../code/code.js';
import xOuts from '../outs/outs.js';
import xDrafts from '../drafts/drafts.js';
import xTree from '../tree/tree.js';
import xDatum from '../datum/datum.js';
import xGrip from '../grip/grip.js';

const template = String.raw /*html*/ `
<div class="app"
  :class="{ 'light': light_theme }"
  :style="{
    '--app-split_left': split_left,
    '--app-split_right': split_right,
    '--app-split_datum': split_datum,
    '--app-split_map': split_map,
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
    <button class="app-map_btn"
      type="button"
      aria-label="map"
      v-on:click="toggle_map">
    </button>
  </div>

  <div class="app-nav">
    <x-drafts class="app-drafts"></x-drafts>
    <x-tree class="app-tree"></x-tree>
  </div>
  <x-code class="app-code"></x-code>
  <x-outs class="app-outs"></x-outs>
  <x-datum class="app-datum"></x-datum>
  <x-map class="app-map"></x-map>

  <x-grip class="app-split_left" :x="split_left" v-on:drag="resize_split_left"></x-grip>
  <x-grip class="app-split_right" :x="-split_right" v-on:drag="resize_split_right"></x-grip>
  <x-grip class="app-split_datum" :y="-split_datum" v-on:drag="resize_split_datum"></x-grip>
  <x-grip class="app-split_map" :y="-split_map" v-on:drag="resize_split_map"></x-grip>
</div>
`;

export default {
  template,
  components: {
    xMap,
    xCode,
    xOuts,
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
    code_selected: vm => vm.$store.code.selected,
    split_left: vm => vm.$store.split_left,
    split_right: vm => vm.$store.split_right,
    split_datum: vm => vm.$store.split_datum,
    split_map: vm => vm.$store.split_map,
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
    resize_split_left({ x }) {
      this.$store.set_split_left(Math.max(50, Math.round(x)));
      dispatchEvent(new Event('resize')); // resize map
    },
    resize_split_right({ x }) {
      this.$store.set_split_right(Math.max(50, Math.round(-x)));
      dispatchEvent(new Event('resize')); // resize map
    },
    resize_split_map({ y }) {
      this.$store.set_split_map(Math.max(50, Math.round(-y)));
      dispatchEvent(new Event('resize')); // resize map
    },
    resize_split_datum({ y }) {
      this.$store.set_split_datum(Math.max(50, Math.round(-y)));
      dispatchEvent(new Event('resize')); // resize map
    },
  },
};
