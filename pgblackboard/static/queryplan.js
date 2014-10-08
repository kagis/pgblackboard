(function () {
'use strict';


window.queryPlan = function (plan) {

    document.querySelector('.main').classList.add('blurred');


    var lowHue = 90; /* green */
    var highHue = 20; /* red */
    var hueDelta = highHue - lowHue;

    var graph = new dagreD3.Digraph();

    plan.nodes.forEach(function (node, nodeId) {
        graph.addNode(nodeId, {
            label: node._type,
            description: getNodeDescription(node),
            fill: '_cost' in node && d3.hsl(hueDelta * node._cost + lowHue, 1, 0.2)
        });
        if ('_parentIndex' in node) {
            graph.addEdge(null, nodeId, node._parentIndex);
        }
    });




    var renderer = new dagreD3.Renderer();
    var zoom = d3.behavior.zoom();

    renderer.zoom(function (graph, svg) {
        return zoom.on('zoom', function() {
            svg.attr('transform', 'translate(' + d3.event.translate + ')scale(' + d3.event.scale + ')');
        });
    });


    var layout = dagreD3.layout()
                        .nodeSep(20)
                        .rankDir('LR');

    var graphContainer = d3.select(document.body)
                           .append('svg')
                           .attr('class', 'queryplan');

    var renderedLayout = renderer.layout(layout)
                                 .run(graph, graphContainer);


    // center
    zoom.translate([
        (document.documentElement.clientWidth - renderedLayout.graph().width) / 2,
        (document.documentElement.clientHeight - renderedLayout.graph().height) / 2
    ]);
    zoom.event(graphContainer);





    var tip = new QueryplanTip();
    var zooming = false;
    var hideTipOnZoomEnd = false;
    zoom.on('zoom.tip', tip.updatePosition.bind(tip))
        .on('zoomstart.tip', function () { zooming = true; })
        .on('zoomend.tip', function () {
            zooming = false;
            if (hideTipOnZoomEnd) {
                tip.hide();
            }
        });

    graphContainer
        .selectAll('.node rect')
            .on('mouseover', function (d) {
                tip.setContent(graph.node(d).description);
                tip.showOn(d3.event.target);
                hideTipOnZoomEnd = false;
            })
            .on('mouseout', function () {
                if (!zooming) {
                    tip.hide();
                }
                hideTipOnZoomEnd = true;
            });
};

function QueryplanTip() {

    var _svgPoint;
    var _currentTarget;
    var _tip = d3.select('body')
                .append('div')
                .attr('class', 'queryplan-tip')
                .style({ display: 'none' });

    this.showOn = function (target) {
        _currentTarget = target;
        _svgPoint = target.ownerSVGElement.createSVGPoint();
        _tip.style({ display: 'block' });
        this.updatePosition();
    };

    this.updatePosition = function () {
        if (!_currentTarget) return;

        var targetCTM = _currentTarget.getScreenCTM();
        var targetBBox = _currentTarget.getBBox();
        _svgPoint.x = targetBBox.x + targetBBox.width / 2;
        _svgPoint.y = targetBBox.y;
        var targetScreenPos = _svgPoint.matrixTransform(targetCTM);
        _tip.style({
            top: targetScreenPos.y + 'px',
            left: targetScreenPos.x + 'px'
        });
    };

    this.hide = function () {
        _currentTarget = null;
        _tip.style({ display: 'none' });
    };

    this.setContent = function (content) {
        _tip.html(content);
    };
}

function getNodeDescription(node) {
    var description = '<table>';
    for (var prop in node) {
        if (prop[0] !== '_') {
            description += '<tr>' +
                '<td>' + prop + '</td>' +
                '<td>' + node[prop] + '</td>' +
                '</tr>';
        }
    }
    description += '</table>';
    return description;
}

})();
