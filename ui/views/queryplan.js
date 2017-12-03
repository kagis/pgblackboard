import el from '../core/el.js';
import dispatch from '../core/dispatch.js';

export default render_queryplan;

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
  props: {
    'Node Type': node_type,
    ...props
  },
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

      ,el('div.queryplan-header'
        ,el('div.queryplan-node_type'
          ,node_type
        )
        ,Number.isFinite(duration) && (
          el('div.queryplan-duration'
            ,duration < 1 ? '<1' : String(Number(duration.toFixed(2)))
            ,el('span.queryplan-muted', 'ms')
          )
        )
      )

      ,props['Relation Name'] && (
        el('div.queryplan-subheader'
          ,el('span.queryplan-muted', 'on ')
          ,props['Relation Name']
          ,props['Alias'] != props['Relation Name'] && ` (${props['Alias']})`
        )
      )

      ,props['Group Key'] && (
        el('div.queryplan-subheader'
          ,el('span.queryplan-muted', 'by ')
          ,String(props['Group Key'])
        )
      )

      ,props['Sort Key'] && (
        el('div.queryplan-subheader'
          ,el('span.queryplan-muted', 'by ')
          ,props['Sort Key']
        )
      )

      ,props['Join Type'] && (
        el('div.queryplan-subheader'
          ,props['Join Type']
          ,el('span.queryplan-muted', ' join')
        )
      )

      ,props['Hash Cond'] && (
        el('div.queryplan-subheader'
          ,el('span.queryplan-muted', 'on ')
          ,props['Hash Cond']
        )
      )

      ,props['Index Name'] && (
        el('div.queryplan-subheader'
          ,el('span.queryplan-muted', 'using ')
          ,props['Index Name']
        )
      )

      ,props['CTE Name'] && (
        el('div.queryplan-subheader'
          ,el('span.queryplan-muted', 'CTE ')
          ,props['CTE Name']
        )
      )

      ,max_duration == duration && (
        el('div.queryplan-badge'
          ,'slowest'
        )
      )

      ,max_cost == cost && (
        el('div.queryplan-badge'
          ,'costliest'
        )
      )

      // ,Object.entries(props).map(([prop, val]) => (
      //   el('div'
      //     ,el('span', prop)
      //     ,':'
      //     ,el('span', String(val))
      //   )
      // ))
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

