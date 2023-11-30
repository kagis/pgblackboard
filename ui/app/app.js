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
  :class="{ 'light': theme == 'light' }"
  :data-theme="theme"
  :style="{
    '--app-splitl': splitl,
    '--app-splitr': splitr,
    '--app-splitv': splitv,
    '--app-datum_height': datum_height,
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
  <div class="app-col_m">
    <x-code class="app-code"></x-code>
    <x-datum class="app-datum"></x-datum>
  </div>
  <div class="app-col_r">
    <x-outs class="app-outs"></x-outs>
    <x-map class="app-map"></x-map>
    <x-grip class="app-splitv" :y="-splitv" v-on:drag="resize_splitv"></x-grip>
  </div>

  <x-grip class="app-splitl" :x="splitl" v-on:drag="resize_splitl"></x-grip>
  <x-grip class="app-splitr" :x="splitr" v-on:drag="resize_splitr"></x-grip>
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
    theme: vm => vm.$store.theme,
    can_run: vm => vm.$store.can_run(),
    can_abort: vm => vm.$store.can_abort(),
    splitl: vm => vm.$store.splitl,
    splitr: vm => vm.$store.splitr,
    splitv: vm => vm.$store.splitv,
    datum_height: vm => 200,
    login_done: vm => vm.$store.login_done,
    code_selected: vm => vm.$store.code.selected,
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
    resize_splitl({ x }) {
      this.$store.set_splitl(Math.round(x));
      dispatchEvent(new Event('resize')); // resize map
    },
    resize_splitr({ x }) {
      this.$store.set_splitr(Math.round(x));
      dispatchEvent(new Event('resize')); // resize map
    },
    resize_splitv({ y }) {
      this.$store.set_splitv(Math.round(-y));
      dispatchEvent(new Event('resize')); // resize map
    },
  },
};
