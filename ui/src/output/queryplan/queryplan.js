var d3 = require('./d3');
var ko = require('knockout');

module.exports = function (frameWindow, plan) {

    var popupElem = document.createElement('div');
    popupElem.className = 'queryplan__popup';
    document.body.appendChild(popupElem);

    var popup = new SVGPopup(popupElem);

    var tree = d3.layout.tree()
                .nodeSize([50, 1]);

    var createSVGElem = document.createElementNS.bind(
        document,
        'http://www.w3.org/2000/svg'
    );

    var graphContainer = createSVGElem('g');
    graphContainer.setAttribute('transform', 'translate(0, 0)');

    var nodes = tree.nodes(plan).reverse();
    nodes.forEach(function (d) {
        d.y = d.depth * 150;
    });

    var links = tree.links(nodes);

    var diagonal = d3.svg.diagonal().projection(function (d) {
        return [d.y, d.x];
    });

    links.forEach(function (d) {
        var path = createSVGElem('path');
        path.setAttribute('d', diagonal(d));
        path.setAttribute('class', 'queryplan__edge');

        graphContainer.appendChild(path);
    });

    var nodeWidth = 100;
    var nodeHeight = 30;

    nodes.forEach(function (d) {

        var nodeLabel = createSVGElem('text');
        nodeLabel.setAttribute('dy', '.3em');
        nodeLabel.setAttribute('text-anchor', 'middle');
        nodeLabel.textContent = d['typ'];

        var nodeRect = createSVGElem('rect');
        nodeRect.setAttribute('rx', 5);
        nodeRect.setAttribute('ry', 5);
        nodeRect.setAttribute('width', nodeWidth);
        nodeRect.setAttribute('height', nodeHeight);
        nodeRect.setAttribute('x', -nodeWidth / 2);
        nodeRect.setAttribute('y', -nodeHeight / 2);

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


    var hidePopupOnPanEnd = false;


    var xmax = nodes.map(function (it) { return it.y; })
                    .reduce(function (a, b) { return Math.max(a, b); });

    var xmin = nodes.map(function (it) { return it.y; })
                    .reduce(function (a, b) { return Math.min(a, b); });

    var ymax = nodes.map(function (it) { return it.x; })
                    .reduce(function (a, b) { return Math.max(a, b); });

    var ymin = nodes.map(function (it) { return it.x; })
                    .reduce(function (a, b) { return Math.min(a, b); });

    var svg = createSVGElem('svg');
    svg.setAttribute('class', 'queryplan__svg');
    svg.setAttribute('viewBox', [
        xmin - nodeWidth / 2,
        ymin - nodeHeight / 2,
        xmax - xmin + nodeWidth,
        ymax - ymin + nodeHeight
    ].join(' '));
    svg.appendChild(graphContainer);

    // node.addEventListener('mouseenter', function () {
    //     if (pane.isPanning) {
    //         hidePopupOnPanEnd = false;
    //     } else {
    //         popup.setContent(getNodeDescription(d['properties']));
    //         popup.showOn(node);
    //     }
    // });
    // node.addEventListener('mouseleave', function () {
    //     if (pane.isPanning) {
    //         hidePopupOnPanEnd = true;
    //     } else {
    //         popup.hide();
    //     }
    // });


    var queryplanEl = frameWindow.document.createElement('div');
    queryplanEl.className = 'queryplan';
    queryplanEl.appendChild(svg);
    queryplanEl.appendChild(popupElem);

    queryplanEl.addEventListener('click', function queryplanClick() {
        queryplanEl.removeEventListener('click', queryplanClick);
        ko.utils.toggleDomNodeCssClass(queryplanEl, 'queryplan--focused', true);

        var pane = new SVGPane({
            paneElem: svg,
            viewportElem: queryplanEl,
            onExtentChange: popup.updatePosition.bind(popup),
            onPanEnd: function () {
                if (hidePopupOnPanEnd) {
                    popup.hide();
                }
            }
        });
    });

    frameWindow.document['currentScript'].parentNode.appendChild(queryplanEl);
};


/** @constructor */
function SVGPopup(popupElem) {
    this.currentTarget = null;
    this.svgPoint = null;
    this.popupElem = popupElem;
}

SVGPopup.prototype.showOn = function (target) {
    this.currentTarget = target;
    this.svgPoint = target['ownerSVGElement']['createSVGPoint']();
    this.popupElem.style.display = 'block';
    this.updatePosition();
};

SVGPopup.prototype.updatePosition = function () {
    if (!this.currentTarget) {
        return;
    }

    var targetCTM = this.currentTarget['getScreenCTM']();
    var targetBBox = this.currentTarget['getBBox']();
    this.svgPoint.x = targetBBox.x + targetBBox.width / 2;
    this.svgPoint.y = targetBBox.y;
    var targetScreenPos = this.svgPoint['matrixTransform'](targetCTM);
    this.popupElem.style.top = targetScreenPos.y + 'px';
    this.popupElem.style.left = targetScreenPos.x + 'px';
};

SVGPopup.prototype.hide = function () {
    this.currentTarget = null;
    this.popupElem.style.display = 'none';
};

SVGPopup.prototype.setContent = function (content) {
    this.popupElem.innerHTML = content;
};


// function buildGraph(node, nodeid, graph) {
//     var lowHue = 90; /* green */
//     var highHue = 20; /* red */
//     var hueDelta = highHue - lowHue;

//     nodeid = nodeid || 1;
//     graph = graph || createBlankGraph();

//     graph.setNode(nodeid, {
//         label: node['typ'],
//         description: getNodeDescription(node['properties']),
//         fill: node['heat'] && d3.hsl(hueDelta * node['heat'] + lowHue, 1, 0.5)
//     });

//     node['children'].forEach(function (child, childIndex) {
//         var parentid = nodeid;
//         var childid = parentid + childIndex + 1;
//         buildGraph(child, childid, graph);
//         graph.setEdge(childid, parentid);
//     });

//     return graph;
// }


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


/** @constructor */
function SVGPane(options) {
    this.paneElem = options.paneElem;
    this.viewportElem = options.viewportElem;
    this.translateX = 0;
    this.translateY = 0;
    this.zoom = 0;
    this.isPanning = false;

    var noop = function () {};
    this.onPanStart = options.onPanStart || noop;
    this.onPanEnd = options.onPanEnd || noop;
    this.onExtentChange = options.onExtentChange || noop;

    this.viewportElem.addEventListener(
        'mousedown',
        this.handleViewportMouseDown.bind(this),
        true
    );

    this.viewportElem.addEventListener(
        'wheel',
        this.handleViewportWheel.bind(this),
        true
    );
}

SVGPane.prototype.minZoom = -20;

SVGPane.prototype.maxZoom = 20;

SVGPane.prototype.zoomFactor = .1;

// SVGPane.prototype.center = function () {
//     var paneBBox = this.paneElem.getBBox();
//     var viewportSize = this.viewportElem.getBoundingClientRect();
//     this.translateX = (viewportSize.width - paneBBox.width) / 2 - paneBBox.x;
//     this.translateY = (viewportSize.height - paneBBox.height) / 2 - paneBBox.y;
//     this.applyTransform();
// };


SVGPane.prototype.applyTransform = function () {
    setTransform(this.paneElem,
        'translate(' +
            this.translateX + 'px,' +
            this.translateY + 'px)' +
        'scale(' + this.getScale() + ')'
    );

    this.onExtentChange();
};

var transformProperty = [
    'transform',
    'webkitTransform',
    'MozTransform',
    'msTransform'
].filter(function (prop) {
    return prop in document.body.style;
})[0];

function setTransform(elem, value) {
    elem.style[transformProperty] = value;
}

SVGPane.prototype.setZoomClipped = function (unclippedZoom) {
    this.zoom = Math.min(this.maxZoom, Math.max(this.minZoom, unclippedZoom));
};

SVGPane.prototype.getScale = function () {
    return Math.exp(this.zoom * this.zoomFactor);
};

SVGPane.prototype.handleViewportMouseDown = function (e) {
    // proceed only for left mouse button
    if (e.button != 0) { return; }

    this.isPanning = true;
    this.onPanStart();

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
        self.onPanEnd();
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
    //this.translateY = this.translateY - (offsetY - this.translateY) * scaleFactor;
    //this.translateX = this.translateX - (offsetX - this.translateX) * scaleFactor;

    this.applyTransform();
};