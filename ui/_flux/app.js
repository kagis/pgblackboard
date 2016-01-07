define(function (require, exports, module) {
  var cito = require('core/cito');
  var store = require('store');
  var renderApp = require('app/renderApp');
  var dispatch = require('core/dispatch');

  function rootNodeFn() {
    return renderApp(store.state);
  }

  store.subscribe(_ => {
    cito.vdom.update(rootNode, rootNodeFn);
  });

  dispatch.subscribe(action => {
    console.log('%o dispatched %c%s ', action, 'font-weight: bold', action.type);
    // console.groupCollapsed(action.type);
    // console.log(action);
    // console.groupEnd();
  });

  var appContainerElem = document.getElementById('pgblackboardApp');
  appContainerElem.innerHTML = '';
  var rootNode = cito.vdom.append(appContainerElem, rootNodeFn);

  window.codemirror.refresh();

  dispatch({
    type: 'ACCEPT_ROOT_TREE_NODES',
    nodes: window['pgBlackboard'].rootTreeNodes,
  });

});

window['acceptRootTreeNodes'] = function (rootTreeNodes) {
  window['pgBlackboard'] = {
    rootTreeNodes: rootTreeNodes,
  };
};
