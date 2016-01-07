'use strict';

csslink('./node.css');

define(function (require, exports, module) {
  const el = require('core/el');
  const bindPopup = require('../popup/bindPopup');

  module.exports = renderQueryPlanNode;

  function renderQueryPlanNode(node) {
    return el('g.queryPlanNode'
      ,el.attr('transform', `translate(${node.x}, ${node.y})`)

      ,el.on('click', _ => dispatch({
        type: 'OPEN_QUERY_PLAN_POPUP',
        queryPlanNodePath: null,
      }))
      // ,el.on('click', e => e.preventDefault())
      ,el.on('mousedown', e => e.stopPropagation())

      ,bindPopup({
        content: el('table.queryPlanProperties'
          ,el('tbody'
            ,node.properties.map(prop => el('tr'
              ,el('td', prop.name)
              ,el('td', prop.value)
            ))
          )
        )
      })

      ,el('rect.queryPlanNode__back'
        ,el.attr('width', node.width)
        ,el.attr('height', node.height)
        ,el.attr('x', -node.width / 2)
        ,el.attr('y', -node.height / 2)
        ,el.attr('rx', 5)
        ,el.attr('ry', 5)
      )

      ,el('rect.queryPlanNode__front'
        ,el.attr('width', node.width)
        ,el.attr('height', node.height)
        ,el.attr('x', -node.width / 2)
        ,el.attr('y', -node.height / 2)
        ,el.attr('rx', 5)
        ,el.attr('ry', 5)
        ,el.style('fill', node.fill)
      )

      ,el('text.queryPlanNode__text'
        ,el.attr('text-anchor', 'middle')
        ,el.attr('dy', '.3em')
        ,node.name
      )
    );
  }

});
