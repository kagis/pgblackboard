(function () {
'use strict';


window.queryPlan = function (plan) {

    var lowHue = 90; /* green */
    var highHue = 20; /* red */
    var hueDelta = highHue - lowHue;

    var graph = new dagreD3.Digraph();

    plan.nodes.forEach(function (node, nodeId) {
        graph.addNode(nodeId, {
            label: node._type,
            description: getNodeDescription(node),
            fill: '_cost' in node && d3.hsl(hueDelta * node._cost + lowHue, 1, 0.5)
        });
        if ('_parentIndex' in node) {
            graph.addEdge(null, nodeId, node._parentIndex);
        }
    });




    var renderer = new dagreD3.Renderer();
    var zoomBehavior = d3.behavior.zoom();

    renderer.zoom(function (graph, svg) {
        return zoomBehavior.on('zoom', function() {
            svg.attr('transform', 'translate(' + d3.event.translate + ')scale(' + d3.event.scale + ')');
        });
    });


    // insert back rect for nodes
    // for color lightening
    var oldDrawNodes = renderer.drawNodes();
    renderer.drawNodes(function(g, svg) {
        var svgNodes = oldDrawNodes(g, svg);
        svgNodes.selectAll('rect').each(function () {
            var back = this.cloneNode();
            this.setAttribute('class', 'node-overlay');

            back.setAttribute('class', 'node-back');
            back.removeAttribute('style');
            back.removeAttribute('fill');
            this.parentNode.insertBefore(back, this);
        });
        return svgNodes;
    });


    var layout = dagreD3.layout()
                        .nodeSep(20)
                        .rankDir('LR');


    var overlay = d3.select(document.body)
                    .append('div')
                    .attr('class', 'queryplan-overlay');

    overlay.append('button')
           .attr('class', 'queryplan-close')
           .on('click', function () { 
                overlay.remove();
         })

    var svg = overlay.append('svg').attr('class', 'queryplan');

    var renderedLayout = renderer.layout(layout)
                                 .run(graph, svg);


    // center
    zoomBehavior.translate([
        (document.documentElement.clientWidth - renderedLayout.graph().width) / 2,
        (document.documentElement.clientHeight - renderedLayout.graph().height) / 2
    ]);
    zoomBehavior.event(svg);





    var tip = new QueryplanTip();
    var zooming = false;
    var hideTipOnZoomEnd = false;
    zoomBehavior.on('zoom.tip', tip.updatePosition.bind(tip))
        .on('zoomstart.tip', function () { zooming = true; })
        .on('zoomend.tip', function () {
            zooming = false;
            if (hideTipOnZoomEnd) {
                tip.hide();
            }
        });

    svg
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
