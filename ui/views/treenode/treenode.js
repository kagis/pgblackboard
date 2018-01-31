import el from '../../core/el.js';
import on from '../../core/on.js';
import dispatch from '../../core/dispatch.js';
import tree_expand from '../../actions/tree_expand.js';
import tree_select from '../../actions/tree_select.js';

export default render_treenode;

function render_treenode({
  treenode_path,
  treenode_id,
  is_expanded,
  is_busy,
  children,
  show_all,
  can_have_children,
  typ,
  name,
  comment,
  selected_treenode_id,
  message
}) {
  const show_message = JSON.stringify(treenode_id) == JSON.stringify(message.treenode_id);
  const is_selected = JSON.stringify(treenode_id) == JSON.stringify(selected_treenode_id);
  const children_limit = 200;
  const is_limited = is_expanded && !show_all && children.length > children_limit;
  const limited_children = is_expanded && (is_limited
    ? children.slice(0, children_limit)
    : children
  );

  return el('div.treenode'

    ,can_have_children && (
      el('button.treenode-toggler'
        ,is_busy && el.class('treenode-toggler--loading')
        ,is_expanded && el.class('treenode-toggler--collapser')
        ,!(is_busy || is_expanded) && el.class('treenode-toggler--expander')
        ,el.attr('disabled', Boolean(is_busy))
        ,el.attr('data-path', JSON.stringify(treenode_path))
        ,el.attr('data-id', JSON.stringify(treenode_id))
      )
    )

    ,el('a.treenode-header'
      ,el.attr('data-id', JSON.stringify(treenode_id))
      ,is_selected && el.class('treenode-header--selected')
      ,el('i.treenode-icon'
        ,el.class('treenode-icon--' + typ)
      )
      ,el('span.treenode-name', name)
      ,el('span.treenode-comment', comment)
    )

    ,show_message && (
      el('div.treenode-message_layout'
        ,el('div.treenode-baloon'
          ,el('div.treenode-message'
            ,message.is_error && el.class('treenode-message--error')
            ,!message.is_error && el.class('treenode-message--info')
            ,message.text
          )
        )
      )
    )

    ,limited_children && (
      el('div.treenode-children'
        ,limited_children.map((child, i) => render_treenode({
          treenode_path: treenode_path.concat(i),
          selected_treenode_id,
          message,
          ...child,
        }))
      )
    )

    ,is_limited && (
      el('button.treenode-showall'
        ,el.on('click', _ => dispatch({
          type: 'TREENODE_EXPAND_ALL',
          treenode_path,
        }))
        ,'show all '
        ,el('strong', String(children.length))
        ,' items'
      )
    )
  );
}

on('.treenode-toggler--expander', 'click', function (e) {
  dispatch(tree_expand({
    treenode_path: JSON.parse(this.dataset.path),
    treenode_id: JSON.parse(this.dataset.id),
  }));
});

on('.treenode-toggler--collapser', 'click', function (e) {
  dispatch({
    type: 'TREENODE_COLLAPSE',
    treenode_path: JSON.parse(this.dataset.path)
  });
});

on('.treenode-header', 'click', function (e) {
  dispatch(tree_select(JSON.parse(this.dataset.id)));
});

