csslink('./app.css');

define(function (require, exports, module) {
  const el = require('core/el');
  const dispatch = require('core/dispatch');
  const splitPanel = require('splitPanel/splitPanel');
  const renderTreeNode = require('tree/renderTreeNode');
  const renderMyQuery = require('myQueries/renderMyQuery');
  const renderCodeForm = require('codeForm/renderCodeForm');
  const renderExecOutput = require('execOutput/renderExecOutput');
  const memoizeLast = require('core/memoizeLast');
  const modificationScript = require('table/modificationScript');

  module.exports = renderApp;

  const renderTreeCached = memoizeLast(renderTree);

  function renderApp(state) {
    const modifyScript = state.execOutput.items && modificationScript(state.execOutput);

    return el('div.main'
      ,state.isDark && el.class('dark')
      ,el('div.main__leftbar'
        ,el('button.main__theme-toggler'
          ,el.on('click', _ => dispatch({
            type: 'TOGGLE_THEME'
          }))
        )
      )
      ,el('div.main__splitpanel-h'
        ,splitPanel.renderHorizontalSplitpanel({
          onRatioChange: ratio => dispatch({
            type: 'SPLIT_HORIZONTAL',
            ratio: ratio
          }),
          ratio: state.horizontalRatio,
          left: el('div.main__nav'

            ,el('div.main__myqueries'
              ,Object.keys(state.myQueries).map(myQueryId => renderMyQuery({
                myQuery: state.myQueries[myQueryId],
                isSelected: myQueryId == state.selectedTreeNodeOrMyQuery.myQueryId,
              }))
            )

            ,renderTreeCached({
              tree: state.tree,
              selectedTreeNodeId: state.selectedTreeNodeOrMyQuery.treeNodeId,
            })

          ), // div.main__nav
          right: splitPanel.renderVerticalSplitpanel({
            onRatioChange: ratio => dispatch({
              type: 'SPLIT_VERTICAL',
              ratio: ratio
            }),
            ratio: state.verticalRatio,
            top: renderCodeForm({
              myQueryId: state.selectedDocument.myQueryId,
              content: modifyScript ||
                      (state.myQueries[state.selectedDocument.myQueryId] &&
                        state.myQueries[state.selectedDocument.myQueryId].content)
                        || state.selectedDocument.content,
              isLoading: state.selectedDocument.isLoading,
              errors: state.selectedDocument.errors,
              selectionRanges: state.selectedDocument.selectionRanges,
             }),
            bottom: el('div.main__output'
              ,renderExecOutput(Object.assign({ isDark: state.isDark }, state.execOutput))
            ),
          }),

        })
      )
    );





    // function getFlatTree(arr, targetDict) {
    //   arr = arr || state.tree;
    //   targetDict = targetDict || {};
    //   for (var i = 0; i < arr.length; i++) {
    //     var node = arr[i];
    //     targetDict[node.path] = node;
    //     getFlatTree(node.childNodes || [], targetDict)
    //   }
    //   return targetDict;
    // }
  }

  function renderTree({ tree, selectedTreeNodeId }) {
    return el('div.main__tree'
      ,tree.nodes.map((node, i) => renderTreeNode({
        treeNode: node,
        path: [i],
        selectedTreeNodeId: selectedTreeNodeId,
        message: tree.message,
      }))
    );
  }




});
