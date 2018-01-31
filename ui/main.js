import cito from './core/cito.js';
import create_store from './core/store.js';
import dispatch from './core/dispatch.js';
import bus from './core/bus.js';
import render_app from './views/app/app.js';
import reduce_app from './reducers/app.js';
import login from './actions/login.js';
import drafts_load from './actions/drafts_load.js';

const appContainerElem = document.getElementById('pgblackboardApp');
appContainerElem.innerHTML = '';

const store = create_store(reduce_app);
const rootNode = cito.vdom.append(appContainerElem, rootNodeFn);

store.subscribe(({ action, state }) => {
  // console.profile('render');
  cito.vdom.update(rootNode, rootNodeFn);
  bus.emit('rendered:' + action.type, action, state);
  // console.profileEnd('render');
  console.log('%o dispatched %c%s %o', action, 'font-weight: bold', action.type, state);
});

function rootNodeFn() {
  return render_app(store.state);
}

dispatch(drafts_load());

const stored_credentials = window.localStorage.getItem('pgblackboard_credentials');
if (stored_credentials) {
  dispatch(login(JSON.parse(stored_credentials)));
}

window.addEventListener('beforeunload', e => {
  return e.returnValue = 'Do you want to exit pgBlackboard?';
});
