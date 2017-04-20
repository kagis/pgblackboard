define(function (require, exports, module) {
  'use strict';
  const el = require('../core/el');
  const dispatch = require('../core/dispatch');

  module.exports = render_queryplan;

  function render_queryplan(node) {
    const flat = (function flatten(node) {
      return [node].concat(...node.children.map(child => flatten(child)));
    })(node);

    const max_cost = flat.map(node => node.cost)
      .reduce((a, b) => Math.max(a, b), -Infinity);
    const max_duration = flat.map(node => node.duration)
      .reduce((a, b) => Math.max(a, b), -Infinity);

    return el('div.queryplan'
      ,render_queryplan_tree(Object.assign({
        max_cost,
        max_duration,
        queryplan_path: [],
      }, node))
    );
  }

  function render_queryplan_tree({
    props,
    children,
    cost,
    duration,
    max_cost,
    max_duration,
    queryplan_path
  }) {
    return el('div.queryplan-tree'
      ,el('div.queryplan-node'
        ,el.on('click', _ => dispatch({
          type: 'QUERYPLAN_NODE_TOGGLE',
          queryplan_path,
        }))
        ,el('div.queryplan-node_type'
          ,props['Node Type']
        )
        ,props['Relation Name'] && el('div.queryplan-relation_name'
          ,'on '
          ,props['Relation Name']
        )
        ,max_cost == cost && el('div.queryplan-badge'
          ,'costiest'
        )
        ,max_duration == duration && el('div.queryplan-badge'
          ,'slowest'
        )
      )
      ,children.length && el('div.queryplan-children'
        ,children.map((child, i) => render_queryplan_tree(Object.assign({
          max_cost,
          max_duration,
          queryplan_path: [...queryplan_path, i],
        }, child)))
      )
    );
  }
  
});
