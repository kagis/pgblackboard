define(function (require, exports, module) {
  // var immutable = require-('immutable');

  const dispatch = require('core/dispatch');
  const createHub = require('core/hub');
  const reduceTree = require('tree/reduceTree');
  const reduceMyQueries = require('myQueries/reduceMyQueries');
  const myQueriesRepo = require('myQueries/myQueriesRepo');
  const reduceResult = require('exec/reduceResult');

  var onStoreChange = createHub();

  var store = {
    state: {
      isDark: false,
      horizontalRatio: 0.3,
      verticalRatio: 0.5,
      selectedTreeNodeOrMyQuery: {},
      selectedDocument: {},
      result: [],
      myQueries: myQueriesRepo.getAll(),
      tree: {
        rootNodes: getInitialTree(),
        message: {
          treeNodeId: null,
          text: null,
          isError: false,
        },
      }
    },
    subscribe: onStoreChange.subscribe,
    hasChanged: onStoreChange
  };

  module.exports = store;
  window.store = store;


  dispatch.subscribe(handleAction);

  function handleAction(action) {
    store.state = reduceAction(store.state, action);
    onStoreChange();
  }

  function reduceAction(state, action) {
    var nextState = {
      isDark: reduceIsDark(state.isDark, action),
      horizontalRatio: reduceHorizontalRatio(state.horizontalRatio, action),
      verticalRatio: reduceVerticalRatio(state.verticalRatio, action),
      tree: reduceTree(state.tree, action),
      myQueries: reduceMyQueries(state.myQueries, action),
      selectedTreeNodeOrMyQuery: reduceSelectedTreeNodeOrMyQuery(state.selectedTreeNodeOrMyQuery, action),
      selectedDocument: reduceSelectedDocument(state.selectedDocument, action),
      result: reduceResult(state.result, action),
    };


    switch (action.type) {


    }

    return nextState;
  }

  function reduceHorizontalRatio(prevRatio, action) {
    switch (action.type) {
      case 'SPLIT_HORIZONTAL':
        return action.ratio;
      default:
        return prevRatio;
    }
  }

  function reduceVerticalRatio(prevRatio, action) {
    switch (action.type) {
      case 'SPLIT_VERTICAL':
        return action.ratio;
      default:
        return prevRatio;
    }
  }

  function reduceIsDark(isDark, action) {
    switch (action.type) {
      case 'TOGGLE_THEME':
        return !isDark;

      default:
        return isDark;
    }
  }

  function reduceSelectedTreeNodeOrMyQuery(state, action) {
    switch (action.type) {
      case 'TREENODE_SELECT':
        return { treeNodeId: action.treeNodeId };

      case 'MYQUERY_SELECT':
        return { myQueryId: action.myQueryId };

      case 'ADD_MYQUERY':
        return { myQueryId: action.myQuery.id };

      default:
        return state;
    }
  }

  function reduceSelectedDocument(selectedDocument, action) {
    switch (action.type) {
      case 'TREENODE_SELECT':
        return Object.assign({}, selectedDocument, {
          isLoading: true
        });

      case 'TREENODE_DEFINITION_LOADED':
        return {
          isLoading: false,
          content: action.content
        };

      case 'MYQUERY_SELECT':
        return { myQueryId: action.myQueryId };

      case 'ADD_MYQUERY':
        return { myQueryId: action.myQuery.id };

      case 'SELECT_SCRIPT_FRAGMENT':
        return Object.assign({}, selectedDocument, {
          selectionRanges: action.ranges
        });

      case 'EXEC':
        return Object.assign({}, selectedDocument, {
          errors: []
        });

      case 'HANDLE_EXEC_RESULT_EVENTS':
        return Object.assign({}, selectedDocument, {
          errors: (selectedDocument.errors || []).concat(
            action.events
              .filter(execEvent => execEvent[0] == 'error')
              .map(execEvent => ({
                text: execEvent[1],
                line: execEvent[2],
              }))
          )
        });

      case 'NAVIGATE_TO_MESSAGE_SOURCE':
        return Object.assign({}, selectedDocument, {
          selectionRanges: [
            {
              head: { line: action.line, ch: 0 },
              anchor: { line: action.line, ch: 0 }
            }
          ]
        });

      default:
        return selectedDocument;

    }
  }

  function getInitialTree() {
    return [ ];
  }

});
