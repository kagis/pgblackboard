'use strict';

define(function (require, exports, module) {
  const reduceCombined = require('core/reduceCombined');
  const reduceTree = require('tree/reduceTree');
  const reduceMyQueries = require('myQueries/reduceMyQueries');
  const reduceExecOutput = require('execOutput/reduceExecOutput');

  module.exports = reduceApp;

  function reduceApp(state, action) {
    return reduceCombined(state, action, {
      isDark: reduceIsDark,
      horizontalRatio: reduceHorizontalRatio,
      verticalRatio: reduceVerticalRatio,
      tree: reduceTree,
      myQueries: reduceMyQueries,
      selectedTreeNodeOrMyQuery: reduceSelectedTreeNodeOrMyQuery,
      selectedDocument: reduceSelectedDocument,
      execOutput: reduceExecOutput,
    });
  }

  function reduceHorizontalRatio(prevRatio = 0.3, action) {
    switch (action.type) {
      case 'INIT':
        return 0.3;
      case 'SPLIT_HORIZONTAL':
        return action.ratio;
      default:
        return prevRatio;
    }
  }

  function reduceVerticalRatio(prevRatio, action) {
    switch (action.type) {
      case 'INIT':
        return 0.5;
      case 'SPLIT_VERTICAL':
        return action.ratio;
      default:
        return prevRatio;
    }
  }

  function reduceIsDark(isDark, action) {
    switch (action.type) {
      case 'INIT':
        return false;
      case 'TOGGLE_THEME':
        return !isDark;
      default:
        return isDark;
    }
  }

  function reduceSelectedTreeNodeOrMyQuery(state, action) {
    switch (action.type) {
      case 'INIT':
        return {};
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
      case 'INIT':
        return {};

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
});
