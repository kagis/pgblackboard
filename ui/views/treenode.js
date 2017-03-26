define(function (require, exports, module) {
  'use strict';
  const el = require('core/el');
  const on = require('core/on');
  const dispatch = require('core/dispatch');
  const tree_expand = require('../actions/tree_expand');
  const tree_select = require('../actions/tree_select');

  module.exports = render_treenode;

  function render_treenode(params) {

    var message = params.treeNode.path == params.message.treeNodeId && params.message;
    var isSelected = JSON.stringify(params.treeNode.path) == JSON.stringify(params.selectedTreeNodeId);

    const childrenLimit = 200;
    const isLimited = params.treeNode.isExpanded &&
                      !params.treeNode.showAll &&
                      params.treeNode.nodes.length > childrenLimit;

    const childNodes = params.treeNode.isExpanded && (isLimited ?
      params.treeNode.nodes.slice(0, childrenLimit) :
      params.treeNode.nodes
    );

    return el('div.treeNode'

      ,params.treeNode.can_have_children && el('button.treeNode__toggler'
        ,el.class(
          params.treeNode.isBusy     ? 'treeNode__toggler--loading'   :
          params.treeNode.isExpanded ? 'treeNode__toggler--collapser' :
                                       'treeNode__toggler--expander'
        )
        ,el.attr('disabled', Boolean(params.treeNode.isBusy))
        ,el.attr('data-path', JSON.stringify(params.path))
        ,el.attr('data-id', JSON.stringify(params.treeNode.path))
        // !params.treeNode.isBusy && el.on('click', _ => dispatch(toggle())),
      )

      ,el('a.treeNode__header'
        ,el.attr('data-id', JSON.stringify(params.treeNode.path))
        ,isSelected && el.class('treeNode__header--selected')
        ,el('i.treeNode__icon'
          ,el.class('treeNode__icon--' + params.treeNode.typ)
        )
        ,el('span.treeNode__name', params.treeNode.name)
        ,el('span.treeNode__comment', params.treeNode.comment)
      )

      ,message && el('div.treeNode__message-layout'
        ,el('div.baloon'
          ,el('div.treeNode__message'
            ,message.isError && el.class('treeNode__message--error')
            ,!message.isError && el.class('treeNode__message--info')
            ,message.text
          )
        )
      )

      ,childNodes && el('div.treeNode__children'
        ,childNodes.map((childNode, i) => render_treenode({
          treeNode: childNode,
          path: params.path.concat(i),
          selectedTreeNodeId: params.selectedTreeNodeId,
          message: params.message,
        }))
      )

      ,isLimited && el('button.treeNode__showAll'
        ,el.on('click', _ => dispatch({
          type: 'SHOW_ALL_TREE_NODE_CHILDREN',
          nodePath: params.path,
        }))
        ,'show all '
        ,el('strong', String(params.treeNode.nodes.length))
        ,' items'
      )
    );
  }

  on('.treeNode__toggler--expander', 'click', function (e) {
    dispatch(tree_expand({
      node_path: JSON.parse(this.dataset.path),
      treenode_id: JSON.parse(this.dataset.id),
    }));
  });

  on('.treeNode__toggler--collapser', 'click', function (e) {
    dispatch({
      type: 'TREENODE_COLLAPSE',
      nodePath: JSON.parse(this.dataset.path)
    });
  });

  on('.treeNode__header', 'click', function (e) {
    dispatch(tree_select(JSON.parse(this.dataset.id)));
  });

});
