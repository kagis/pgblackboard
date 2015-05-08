// var d3 = require('d3');

/** @expose */
window.pgBlackboardOutput = {};

/** @expose */
window.pgBlackboardOutput.queryPlan = function (plan) {

    var tree = d3.layout.tree()
                .nodeSize([50, 1]);

    var createSVGElem = document.createElementNS.bind(
        document,
        'http://www.w3.org/2000/svg'
    );
    var svg = createSVGElem('svg');
    svg.setAttribute('class', 'queryplan');
    //svg.setAttribute('width', width);
    //svg.setAttribute('height', height);

    document.body.appendChild(svg);

    var graphContainer = createSVGElem('g');
    graphContainer.setAttribute('transform', 'translate(0, 0)');
    svg.appendChild(graphContainer);



    var nodes = tree.nodes(plan).reverse();
    nodes.forEach(function(d) {
        d.y = d.depth * 150;
    });

    var links = tree.links(nodes);

    var diagonal = d3.svg.diagonal().projection(function(d) {
        return [d.y, d.x];
    });

    links.forEach(function (d) {
        var path = createSVGElem('path');
        path.setAttribute('d', diagonal(d));
        path.setAttribute('class', 'queryplan__edge');

        graphContainer.appendChild(path);
    });

    nodes.forEach(function(d) {

        var nodeLabel = createSVGElem('text');
        nodeLabel.setAttribute('dy', '.3em');
        nodeLabel.setAttribute('text-anchor', 'middle');
        nodeLabel.textContent = d['typ'];

        var nodeRect = createSVGElem('rect');
        nodeRect.setAttribute('rx', 5);
        nodeRect.setAttribute('ry', 5);
        nodeRect.setAttribute('width', 100);
        nodeRect.setAttribute('height', 30);
        nodeRect.setAttribute('x', -50);
        nodeRect.setAttribute('y', -15);

        var lowHue = 90; /* green */
        var highHue = 20; /* red */
        var hueDelta = highHue - lowHue;
        nodeRect.setAttribute(
            'fill',
            'hsl(' + (hueDelta * d['heat'] + lowHue) + ', 100%, 50%)'
        );

        var node = createSVGElem('g');
        node.setAttribute('class', 'queryplan__node');
        node.setAttribute('transform', 'translate(' + d.y + ',' + d.x + ')');
        node.appendChild(nodeRect);
        node.appendChild(nodeLabel);

        graphContainer.appendChild(node);
    });


    setupAndCenterSVGPane(graphContainer);

};

/** @expose */
window.pgBlackboardOutput.queryPlan_ = function (planTree) {

    var graph = buildGraph(planTree);


    var renderer = new dagreD3.Renderer();
    var zoomBehavior = d3.behavior.zoom();

    // renderer.zoom(function (graph, svg) {
    //     return zoomBehavior.on('zoom', function () {
    //         svg.attr('transform', 'translate(' + d3.event.translate + ')scale(' + d3.event.scale + ')');
    //     });
    // });

    // insert back rect for nodes
    // for color lightening
    var oldDrawNodes = renderer.drawNodes();
    renderer.drawNodes(function (g, svg) {
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



    var overlay = d3.select(document.body)
                    .append('div')
                    .attr('class', 'queryplan-overlay');

    overlay.append('button')
           .attr('class', 'queryplan-close')
           .on('click', function () { overlay.remove(); });

    var svg = overlay.append('svg').attr('class', 'queryplan');

  //   var svg = d3.select('svg'),
  //     inner = svg.select('g'),
  //     zoom = d3.behavior.zoom().on('zoom', function() {
  //       inner.attr('transform', 'translate(' + d3.event.translate + ')' +
  //                                   'scale(' + d3.event.scale + ')');
  //     });
  // svg.call(zoom);

    render(svg, graph);

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
        if (!_currentTarget) {
            return;
        }

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

function buildGraph(node, nodeid, graph) {
    var lowHue = 90; /* green */
    var highHue = 20; /* red */
    var hueDelta = highHue - lowHue;

    nodeid = nodeid || 1;
    graph = graph || createBlankGraph();

    graph.setNode(nodeid, {
        label: node['typ'],
        description: getNodeDescription(node['properties']),
        fill: node['heat'] && d3.hsl(hueDelta * node['heat'] + lowHue, 1, 0.5)
    });

    node['children'].forEach(function (child, childIndex) {
        var parentid = nodeid;
        var childid = parentid + childIndex + 1;
        buildGraph(child, childid, graph);
        graph.setEdge(childid, parentid);
    });

    return graph;
}

function createBlankGraph() {
    return new dagreD3.graphlib.Graph().setGraph({
        nodesep: 20,
        rankdir:'LR'
    });
}

function getNodeDescription(properties) {
    var description = '<table>';
    for (var prop in properties) {
        description += '<tr>' +
            '<td>' + prop + '</td>' +
            '<td>' + properties[prop] + '</td>' +
            '</tr>';
    }
    description += '</table>';
    return description;
}

function setupAndCenterSVGPane(paneElem) {
    var pane = new SVGPane(paneElem);
    pane.center();
    return pane;
}

function SVGPane(paneElem) {
    this.paneElem = paneElem;
    this.viewportElem = paneElem.ownerSVGElement;
    this.translateX = 0;
    this.translateY = 0;
    this.zoom = 0;
    this.isPanning = false;

    this.viewportElem.addEventListener(
        'mousedown',
        this.handleViewportMouseDown.bind(this)
    );

    this.viewportElem.addEventListener(
        'wheel',
        this.handleViewportWheel.bind(this)
    );
}

SVGPane.prototype.minZoom = -20;

SVGPane.prototype.maxZoom = 20;

SVGPane.prototype.center = function () {
    var paneBBox = this.paneElem.getBBox();
    var viewportSize = this.viewportElem.getBoundingClientRect();
    this.translateX = (viewportSize.width - paneBBox.width) / 2 - paneBBox.x;
    this.translateY = (viewportSize.height - paneBBox.height) / 2 - paneBBox.y;
    this.applyTransform();
};

SVGPane.prototype.applyTransform = function () {
    this.paneElem.setAttribute('transform',
        'translate(' + this.translateX + ',' + this.translateY + ')' +
        'scale(' + this.getScale() + ')'
    );
};

SVGPane.prototype.setZoomClipped = function (unclippedZoom) {
    this.zoom = Math.min(this.maxZoom, Math.max(this.minZoom, unclippedZoom));
};

SVGPane.prototype.getScale = function () {
    return Math.exp(this.zoom * .1);
};

SVGPane.prototype.handleViewportMouseDown = function (e) {
    // proceed only for left mouse button
    if (e.button != 0) { return; }

    this.isPanning = true;

    var dx = e.clientX - this.translateX;
    var dy = e.clientY - this.translateY;

    var self = this;
    function handleMouseMove(e) {
        self.translateX = e.clientX - dx;
        self.translateY = e.clientY - dy;
        self.applyTransform();
    }


    var doc = this.paneElem.ownerDocument;
    doc.addEventListener('mousemove', handleMouseMove);
    doc.addEventListener('mouseup', function handleMouseUp(e) {
        doc.removeEventListener('mouseup', handleMouseUp);
        doc.removeEventListener('mousemove', handleMouseMove);
        self.isPanning = false;
    });
};

SVGPane.prototype.handleViewportWheel = function (e) {
    // disable zoom while panning
    if (this.isPanning) { return; }

    var oldScale = this.getScale();
    var zoomInc = (e.deltaY < 0 ? 1 : -1);
    this.setZoomClipped(this.zoom + zoomInc);
    var newScale = this.getScale();
    var scaleFactor = newScale / oldScale - 1;

    var offsetX = e.clientX - this.viewportElem.offsetLeft;
    var offsetY = e.clientY - this.viewportElem.offsetTop;
    this.translateY = this.translateY - (offsetY - this.translateY) * scaleFactor;
    this.translateX = this.translateX - (offsetX - this.translateX) * scaleFactor;

    this.applyTransform();
};
