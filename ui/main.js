import { createApp, reactive, readonly } from 'https://unpkg.com/vue@3.3.11/dist/vue.esm-browser.js';
import root_component from './app/app.js';
import { Store } from './store.js';

const store = new Store();
const app = createApp(root_component);
app.config.globalProperties.$store = reactive(store);
app.mount('body');

window.debug_store = store;
