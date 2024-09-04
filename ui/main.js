import monaco_worker from './_lib/monaco_worker.js';
import monaco_json_worker from './_lib/monaco_json_worker.js';
import { editor } from './_lib/monaco.js';
import { createApp, reactive, watchEffect, h } from './_lib/vue.js';
import root_component from './app/app.js';
import { Store } from './store.js';

globalThis.MonacoEnvironment = {
  getWorker(_module_id, label) {
    switch (label) {
      case 'json': return monaco_json_worker();
      default: return monaco_worker();
    }
	},
};

editor.defineTheme('pgbb-dark', {
	base: 'vs-dark',
	inherit: true,
  colors: {},
	rules: [
    { token: 'comment', foreground: '888888' },
    { token: 'string.sql', foreground: 'CE9178' },
  ],
});

editor.defineTheme('pgbb-light', {
	base: 'vs',
	inherit: true,
  colors: {},
	rules: [
    { token: 'comment', foreground: '888888' },
    { token: 'string.sql', foreground: 'A31515' },
  ],
});

const store = reactive(new Store());
const app = createApp({
  // TODO createApp(root_component) does not render by mixin
  render() { return h(root_component); },
});
app.config.globalProperties.$store = store;
app.config.globalProperties.$h = h;

watchEffect(_ => {
  editor.setTheme(store.light_theme ? 'pgbb-light' : 'pgbb-dark');
});

app.mixin({
  render() {
    return transform_vdom(this._render());
  },
  mounted() {
    this._mounted?.();
  },
  unmounted() {
    this._unmounted?.();
  },
});

function transform_vdom(def) {
  const { tag, inner, ...props } = def || 0;
  if (!tag) return def;
  return h(tag, props, Array.isArray(inner) ? inner.map(transform_vdom) : inner);
};

app.mount('body');

globalThis.debug_store = store;
