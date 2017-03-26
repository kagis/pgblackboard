define(function (require, exports, module) {
  const d3 = require('./d3_tree_layout');

  module.exports = computeQueryPlanLayout;

  function computeQueryPlanLayout(rootQueryPlanNode) {

    const resultLayout = {};

    const nodeWidth = 100;
    const nodeHeight = 30;
    const highHue = 20; /* deg */
    const lowHue = 90; /* deg */
    const hueDelta = highHue - lowHue;

    const treeLayout = d3.layout.tree().nodeSize([50, 1]);

    const preNodes = treeLayout
      .nodes(rootQueryPlanNode)
      .map(function (it) {
        it.y = it.depth * 150;
        return it;
      });


    const diagonal = d3.svg.diagonal().projection(function (it) {
      return [it.y, it.x];
    });

    const edges = treeLayout
      .links(preNodes)
      .map(function (it) {
        return {
          /** @export */
          pathData: diagonal(it)
        }
      });

    const nodes = preNodes.map(it => ({
      x: it.y,
      y: it.x,
      name: it['typ'],
      properties: dictToArrayOfNameAndValue(it['properties']),
      fill: hsl(hueDelta * it['heat'] + lowHue, 100, 50),
      width: nodeWidth,
      height: nodeHeight
    }));

    const bounds = nodes.reduce(
      (acc, it) => ({
        xmin: Math.min(it.x, acc.xmin),
        xmax: Math.max(it.x, acc.xmax),
        ymin: Math.min(it.y, acc.ymin),
        ymax: Math.max(it.y, acc.ymax),
      }),
      {
        xmin: Infinity,
        xmax: -Infinity,
        ymin: Infinity,
        ymax: -Infinity,
      }
    );

    const viewBox = [
      bounds.xmin - nodeWidth / 2,
      bounds.ymin - nodeHeight / 2,
      bounds.xmax - bounds.xmin + nodeWidth,
      bounds.ymax - bounds.ymin + nodeHeight
    ];

    const width = bounds.xmax - bounds.xmin + nodeWidth;
    const height = bounds.ymax - bounds.ymin + nodeHeight;

    return {
      width: width,
      height: height,
      viewBox: viewBox,
      nodes: nodes,
      edges: edges,
    };
  }

  function hsl(hue, saturation, lightness) {
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }

  function dictToArrayOfNameAndValue(dict) {
    var namesAndValues = [];
    for (var propName in dict) {
      namesAndValues.push({
        'name': propName,
        'value': dict[propName]
      });
    }
    return namesAndValues;
  }

});
