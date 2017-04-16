define(function (require, exports, module) {
  const cito = require('./core/cito');
  const create_store = require('./core/store');
  const dispatch = require('./core/dispatch');
  const bus = require('./core/bus');
  const render_app = require('./views/app');
  const reduce_app = require('./reducers/app');
  const login = require('./actions/login');
  const drafts_load = require('./actions/drafts_load');

  const appContainerElem = document.getElementById('pgblackboardApp');
  appContainerElem.innerHTML = '';

  const store = create_store(reduce_app);
  const rootNode = cito.vdom.append(appContainerElem, rootNodeFn);

  store.subscribe(({ action, state }) => {
    // console.profile('render');
    cito.vdom.update(rootNode, rootNodeFn);
    bus.emit('rendered:' + action.type, action);
    // console.profileEnd('render');
    console.log('%o dispatched %c%s %o', action, 'font-weight: bold', action.type, state);
  });

  function rootNodeFn() {
    return render_app(store.state);
  }

  dispatch(drafts_load());
});
