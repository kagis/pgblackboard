import monaco_json_worker from './_lib/monaco_json_worker.js';
import monaco_editor_worker from './_lib/monaco_editor_worker.js';
import { editor } from './_lib/monaco.js';
import { createApp, reactive, watchEffect, h } from './_lib/vue.js';
import root_component from './app/app.js';
import { Store } from './store.js';

window.MonacoEnvironment = {
  getWorker(_module_id, label) {
    switch (label) {
      case 'json': return monaco_json_worker();
      default: return monaco_editor_worker();
    }
	}
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
const app = createApp(root_component);
app.config.globalProperties.$store = store;
app.config.globalProperties.$h = h;

watchEffect(_ => {
  editor.setTheme(store.light_theme ? 'pgbb-light' : 'pgbb-dark');
});

// app.mixin({
//   beforeCreate() {
//     // TODO map_getters, map_actions,
//     console.log('beforeCreate', this.$options);
//   },
// });

app.mount('body');

window.debug_store = store;
