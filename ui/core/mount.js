
import cito from 'core/cito.js';
import create_store from 'core/store.js';
import dispatch from 'core/dispatch.js';
import bus from './core/bus.js';


export default mount;

function mount({ el, render, reduce }) {
  el.innerHTML = '';

  const state = reduce(null, { type: 'INIT' });
  const vnode = cito.vdom.append(el, render(state));

  bus.on('action', action => {
    state = reduce(state, action);
    cito.vdom.update(vnode, render(state));
    bus.emit('render', action);
  });
}

// dispatch.subscribe(action => {
//   console.log('%o dispatched %c%s ', action, 'font-weight: bold', action.type);
// });

// dispatch.subscribe(action => {
//   if (typeof action == 'function') {
//     action(dispatch, store.state);
//   }
// });

const appContainerElem = document.getElementById('pgblackboardApp');
appContainerElem.innerHTML = '';

store.subscribe(({ action, state }) => {
  // console.profile('render');
  cito.vdom.update(rootNode, rootNodeFn);
  bus.emit('rendered', action);
  // console.profileEnd('render');

  console.log('%o dispatched %c%s %o', action, 'font-weight: bold', action.type, state);
});

function rootNodeFn() {
  return render_app(store.state);
}

