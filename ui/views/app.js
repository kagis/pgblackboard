define(function (require, exports, module) {
  'use strict';
  const el = require('../core/el');
  const dispatch = require('../core/dispatch');
  const { horizontal_splitpanel, vertical_splitpanel } = require('./splitpanel');
  const render_treenode = require('./treenode');
  const render_draft = require('./draft');
  const renderCodeForm = require('./codeform');
  const renderExecOutput = require('./output');
  const login_form = require('views/login_form');

  module.exports = render_app;
  
  function render_app(state) {
    return el('div.main'
      ,state.is_dark && el.class('dark')
      ,state.credentials.is_authenticated
        ? render_authenticated(state)
        : login_form(state.credentials)
    );
  }

  function render_authenticated(state) {
    return el('div'
      ,el('div.main__leftbar'
        ,el('button.main__theme-toggler'
          ,el.on('click', _ => dispatch({
            type: 'TOGGLE_THEME'
          }))
        )
      )
      ,el('div.main__splitpanel-h'
        ,horizontal_splitpanel({
          on_ratio_change: ratio => dispatch({
            type: 'SPLIT_HORIZONTAL',
            ratio: ratio
          }),
          ratio: state.ratio_horizontal,
          left: el('div.main__nav'

            ,el('div.main__drafts'
              ,Object.keys(state.drafts).map(draft_id => render_draft({
                draft: state.drafts[draft_id],
                isSelected: draft_id == state.selected_treenode_or_draft.draft_id,
              }))
            )

            ,el.memoize(render_tree, {
              tree: state.tree,
              selected_treenode_id: state.selected_treenode_or_draft.treenode_id,
            })
            
            // ,!state.credentials.is_authenticated && (
            //   login_form()
            // )

          ), // div.main__nav
          right: vertical_splitpanel({
            on_ratio_change: ratio => dispatch({
              type: 'SPLIT_VERTICAL',
              ratio: ratio
            }),
            ratio: state.ratio_vertical,
            top: renderCodeForm({
              draft_id: state.selected_document.draft_id,
              content: (state.drafts[state.selected_document.draft_id] ||
                state.selected_document).content,
              is_loading: state.selected_document.is_loading,
              errors: state.selected_document.errors,
              selection_ranges: state.selected_document.selection_ranges,
             }),
            bottom: el('div.main__output'
              ,el.memoize(renderExecOutput, {
                is_dark: state.is_dark,
                stmt_results: state.stmt_results,
                edits: state.edits,
                errors: state.errors,
              })
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

  function render_tree({ tree, selected_treenode_id }) {
    return el('div.main__tree'
      ,tree.nodes.map((node, i) => render_treenode({
        treeNode: node,
        path: [i],
        selected_treenode_id,
        message: tree.message,
      }))
    );
  }

});
