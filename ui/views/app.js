define(function (require, exports, module) {
  'use strict';
  const el = require('../core/el');
  const dispatch = require('../core/dispatch');
  const { horizontal_splitpanel, vertical_splitpanel } = require('./splitpanel');
  const render_treenode = require('./treenode');
  const render_draft = require('./draft');
  const render_codeform = require('./codeform');
  const render_output = require('./output');
  const render_loginform = require('./loginform');

  module.exports = render_app;
  
  function render_app(state) {
    return el('div.main'
      ,state.is_dark && el.class('dark')
      ,state.credentials.is_authenticated
        ? render_authenticated(state)
        : render_loginform(state.credentials)
    );
  }

  function render_authenticated(state) {
    return el('div'
      // ,el('div.main-leftbar'
      //   ,el('button.main-theme_toggler'
      //     ,el.on('click', _ => dispatch({
      //       type: 'TOGGLE_THEME'
      //     }))
      //   )
      // )
      ,el('div.main-splitpanel_h'
        ,horizontal_splitpanel({
          on_ratio_change: ratio => dispatch({
            type: 'SPLIT_HORIZONTAL',
            ratio: ratio
          }),
          ratio: state.split.horizontal,
          left: el('div.main-nav'

            ,el('div.main-drafts'
              ,Object.keys(state.drafts).map(draft_id => render_draft({
                draft: state.drafts[draft_id],
                is_selected: draft_id == state.selected_treenode_or_draft.draft_id,
              }))
            )

            ,el.memoize(render_tree, {
              tree: state.tree,
              selected_treenode_id: state.selected_treenode_or_draft.treenode_id,
            })
            
            // ,!state.credentials.is_authenticated && (
            //   render_loginform()
            // )

          ), // div.main__nav
          right: vertical_splitpanel({
            on_ratio_change: ratio => dispatch({
              type: 'SPLIT_VERTICAL',
              ratio,
            }),
            ratio: state.split.vertical,
            top: render_codeform({
              draft_id: state.selected_document.draft_id,
              content: (state.drafts[state.selected_document.draft_id] ||
                state.selected_document).content,
              is_loading: state.selected_document.is_loading,
              errors: state.selected_document.errors,
              selection_ranges: state.selected_document.selection_ranges,
            }),
            bottom: el('div.main-output'
              ,el.memoize(render_output, {
                use_map: state.use_map,
                is_dark: state.is_dark,
                stmt_results: state.stmt_results,
                edits: state.edits,
                errors: state.errors,
                focused_row: state.focused_row,
                split: state.split.output,
              })
            ),
          }),

        })
      )
    );
  }

  function render_tree({ tree, selected_treenode_id }) {
    return el('div.main-tree'
      ,tree.nodes.map((node, i) => render_treenode(Object.assign({
        selected_treenode_id,
        message: tree.message,
        treenode_path: [i],
      }, node)))
    );
  }

});
