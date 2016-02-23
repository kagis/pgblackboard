define(function (require, exports, module) {
  const cito = require('core/cito');
  const createStore = require('core/store');
  const dispatch = require('core/dispatch');
  const renderApp = require('app/renderApp');
  const reduceApp = require('app/reduceApp');
  const myQueriesRepo = require('myQueries/myQueriesRepo');


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

  const store = createStore(reduceApp);
  const rootNode = cito.vdom.append(appContainerElem, rootNodeFn);

  store.subscribe(({ action, state }) => {
    // console.profile('render');
    cito.vdom.update(rootNode, rootNodeFn);
    // console.profileEnd('render');

    console.log('%o dispatched %c%s %o', action, 'font-weight: bold', action.type, state); 
  });

  function rootNodeFn() {
    return renderApp(store.state);
  }


  window.codemirror.refresh();

  dispatch({
    type: 'LOAD_TREE',
    nodes: window['pgBlackboard'].rootTreeNodes,
  });

  dispatch({
    type: 'LOAD_MYQUERIES',
    myQueries: myQueriesRepo.getAll(),
  });

});

window['acceptRootTreeNodes'] = function (rootTreeNodes) {
  window['pgBlackboard'] = {
    rootTreeNodes: rootTreeNodes,
  };
};
