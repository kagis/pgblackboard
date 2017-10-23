import el from '../core/el.js';
import dispatch from '../core/dispatch.js';
import { horizontal_splitpanel, vertical_splitpanel } from './splitpanel.js';
import render_treenode from './treenode.js';
import render_draft from './draft.js';
import render_codeform from './codeform.js';
import render_output from './output.js';
import render_loginform from './loginform.js';

export default state => {
  return el('div.main'
    ,state.is_dark && el.class('dark')
    ,state.credentials.is_authenticated
      ? render_authenticated(state)
      : render_loginform(state.credentials)
  );
};

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
            is_executing: state.is_executing,
          }),
          bottom: el('div.main-output'
            ,el.memoize(render_output, {
              map: state.map,
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
