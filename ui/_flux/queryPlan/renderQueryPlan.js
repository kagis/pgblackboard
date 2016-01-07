'use strict';

csslink('./queryPlan.css');

define(function (require, exports, module) {
  const el = require('core/el');
  const computeQueryPlanLayout = require('./computeQueryPlanLayout');
  const renderZoomPan = require('./zoomPan/renderZoomPan');
  const renderEdge = require('./edge/renderEdge');
  const renderNode = require('./node/renderNode');

  module.exports = renderQueryPlan;

  function renderQueryPlan(queryPlan, index) {



    return el('div.queryPlanContainer'

      ,queryPlan.isFullPageView && el.class('queryPlanContainer--fullPage')
      ,!queryPlan.isFullPageView && el.class('queryPlanContainer--preview')

      ,!queryPlan.isFullPageView && el.on('click', _ => dispatch({
        type: 'EXPAND_QUERY_PLAN',
        resultIndex: index,
      }))

      ,el('div.queryPlanContainer__zoomPan'
        ,renderZoomPan({
          offsetX: queryPlan.offsetX,
          offsetY: queryPlan.offsetY,
          zoom: queryPlan.zoom,
          isEnabled: queryPlan.isFullPageView,
          onChange: extent => dispatch({
            type: 'MOVE_QUERY_PLAN',
            extent: extent,
            resultIndex: index,
          }),
          content: queryPlan.isFullPageView ?
            renderQueryPlanHtml(queryPlan.rootQueryPlanNode) :
            renderQueryPlanSvg(queryPlan.rootQueryPlanNode)
        })
      )

      ,queryPlan.isFullPageView && el('button.queryPlanContainer__close'
        ,el.on('click', e => {
          dispatch({
            type: 'COLLAPSE_QUERY_PLAN',
            resultIndex: index,
          });
          e.stopPropagation();
        })
        ,'×' // &times;
      )
    );
  }


  function renderQueryPlanSvg(rootQueryPlanNode) {
    const layout = computeQueryPlanLayout(rootQueryPlanNode);
    return el('svg.queryPlan'
      ,el.attr('viewBox', layout.viewBox.join(' '))
      ,el.attr('height', layout.height + 'px')
      ,el.attr('width', layout.width + 'px')
      ,layout.edges.map(renderEdge)
      ,layout.nodes.map(renderNode)
    );
  }

  function renderQueryPlanHtml(rootQueryPlanNode) {
    const layout = computeQueryPlanLayout(rootQueryPlanNode);
    return el('div.queryPlan'
      ,layout.nodes.map(node => el('div.queryPlanNode'
        ,el.style('left', node.x - layout.viewBox[0] + 'px')
        ,el.style('top', node.y - layout.viewBox[1] + 'px')
        ,el.style('background-color', node.fill)

        ,el('div.queryPlanNode__text', node.name)

        ,el('div.queryPlanNode__popup'
          ,el('div.queryPlanPopup'
            ,el('table.queryPlanProperties'
              ,el('tbody'
                ,node.properties.map(prop => el('tr'
                  ,el('td', String(prop.name))
                  ,el('td', String(prop.value))
                ))
              )
            )
          )

        )
      ))
      ,el('svg.queryPlan'
        ,el.attr('viewBox', layout.viewBox.join(' '))
        ,el.attr('height', layout.height + 'px')
        ,el.attr('width', layout.width + 'px')
        ,layout.edges.map(renderEdge)
      )
    );
    // return el('svg.queryPlan'
    //   ,el.attr('viewBox', layout.viewBox.join(' '))
    //   ,el.attr('height', layout.height + 'px')
    //   ,el.attr('width', layout.width + 'px')
    //   ,layout.edges.map(renderEdge)
    //   ,layout.nodes.map(renderNode)
    // );
  }






});
