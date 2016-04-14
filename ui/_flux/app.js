define(function (require, exports, module) {
  const cito = require('core/cito');
  const createStore = require('core/store');
  const dispatch = require('core/dispatch');
  const renderApp = require('app/renderApp');
  const reduceApp = require('app/reduceApp');
  const myQueriesRepo = require('myQueries/myQueriesRepo');
  const sqlQuery = require('webapi/sqlQuery')

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
    type: 'LOAD_MYQUERIES',
    myQueries: myQueriesRepo.getAll(),
  });

  sqlQuery({
    database: 'postgres', // 'postgres',
    user: 'postgres',
    password: 'postgres',
    fields: [
      'datname',
      'comment',
    ],
    statement: `
      SELECT      datname
                , shobj_description(oid, 'pg_database')
      FROM      pg_database
      WHERE     NOT datistemplate
      ORDER BY  datname
    `,
  }).then(nodes => dispatch({
      type: 'LOAD_TREE',
      nodes: nodes.map(it => ({
        typ: 'database',
        name: it.datname,
        can_have_children: true,
        path: [it.datname, 'database', it.datname],
        comment: it.comment,
        group: 0,
      })),
  }))

});

// window['acceptRootTreeNodes'] = function (rootTreeNodes) {
//   window['pgBlackboard'] = {
//     rootTreeNodes: rootTreeNodes,
//   };
// };
