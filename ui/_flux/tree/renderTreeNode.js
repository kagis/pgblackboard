csslink('./treeNode.css');

define(function (require, exports, module) {
  var el = require('core/el');
  var on = require('core/on');
  var dispatch = require('core/dispatch');
  var expandTreeNode = require('./expandTreeNode');
  var selectTreeNode = require('./selectTreeNode');

  module.exports = renderTreeNode;

  function renderTreeNode(params) {

    var message = params.treeNode.path == params.message.treeNodeId && params.message;
    var isSelected = JSON.stringify(params.treeNode.path) == JSON.stringify(params.selectedTreeNodeId);

    return el('div.treeNode'

      ,params.treeNode.can_have_children && el('button.treeNode__toggler'
        ,el.class(
          params.treeNode.isBusy     ? 'treeNode__toggler--loading'   :
          params.treeNode.isExpanded ? 'treeNode__toggler--collapser' :
                                       'treeNode__toggler--expander'
        )
        ,el.attr('disabled', Boolean(params.treeNode.isBusy))
        ,el.attr('data-path', JSON.stringify(params.path))
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

      ,params.treeNode.isExpanded && el('div.treeNode__children'
        ,params.treeNode.childNodes.map((childNode, i) => renderTreeNode({
          treeNode: childNode,
          path: params.path.concat(i),
          selectedTreeNodeId: params.selectedTreeNodeId,
          message: params.message,
        }))
      )
    );
  }

  on('.treeNode__toggler--expander', 'click', function (e) {
    expandTreeNode(JSON.parse(this.dataset.path))
  });

  on('.treeNode__toggler--collapser', 'click', function (e) {
    dispatch({
      type: 'TREENODE_COLLAPSE',
      nodePath: JSON.parse(this.dataset.path)
    });
  });

  on('.treeNode__header', 'click', function (e) {
    selectTreeNode(JSON.parse(this.dataset.id))
  });

});
