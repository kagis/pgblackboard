var d3 = require('./d3');
var ko = require('knockout');
var queryplanOverlayTemplate = require('./queryplan-overlay-template.html');
var queryplanTemplate = require('./queryplan-template.html');


function QueryPlanNode(options) {
    this.name = options.name;
    this.x = options.x;
    this.y = options.y;

    var hueDelta = this.highHue = this.lowHue;
    var hue = hueDelta * options.heat + this.lowHue;
    this.fill = 'hsl(' + hue + ', 100%, 50%)';
}

QueryPlanNode.prototype.highHue = 90; /* deg */
QueryPlanNode.prototype.lowHue = 20; /* deg */
QueryPlanNode.prototype.width = 100;
QueryPlanNode.prototype.height = 30;


module.exports = function (frameWindow, plan) {

    var popupElem = document.createElement('div');
    popupElem.className = 'queryplan__popup';
    document.body.appendChild(popupElem);

    var popup = new SVGPopup(popupElem);

    var tree = d3.layout.tree()
                .nodeSize([50, 1]);

    var nodes = tree.nodes(plan).reverse();
    nodes.forEach(function (d) {
        d.y = d.depth * 150;
    });

    var links = tree.links(nodes);

    var diagonal = d3.svg.diagonal().projection(function (d) {
        return [d.y, d.x];
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
    var nodeWidth = 100;
    var nodeHeight = 30;
    var elem = frameWindow.document.createElement('div');
    elem.innerHTML = queryplanTemplate;
    ko.applyBindings({
        nodes: nodes.map(function (n) {
            var highHue = 20; /* deg */
            var lowHue = 90; /* deg */
            var hueDelta = highHue - lowHue;
            var hue = hueDelta * n['heat'] + lowHue;
            return {
                x: n.y,
                y: n.x,
                name: n['typ'],
                fill: 'hsl(' + hue + ', 100%, 50%)',
                width: nodeWidth,
                height: nodeHeight
            };
        }),
        edges: links.map(function (d) {
            return {
                pathData: diagonal(d)
            };
        }),
        viewBox: [
            xmin - nodeWidth / 2,
            ymin - nodeHeight / 2,
            xmax - xmin + nodeWidth,
            ymax - ymin + nodeHeight
        ]
    }, elem);

    var queryplanEl = elem.children[0];

    queryplanEl.addEventListener('click', handleQueryplanPreviewClick);

    /*function queryplanClick() {
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
    });*/

    frameWindow.document['currentScript'].parentNode.appendChild(queryplanEl);
};

// function QueryPlan() {
//     this.viewBox = [
//     ];
//     this.nodes = nodes;
//     this.edges = edges;
// }


var queryplanOverlay = null;

function getQueryplanOverlay(ownerDocument) {
    if (!queryplanOverlay) {
        queryplanOverlay = new QueryplanOverlay();
        var elem = ownerDocument.createElement('div');
        elem.innerHTML = queryplanOverlayTemplate;
        ownerDocument.body.appendChild(elem);
        ko.applyBindings(queryplanOverlay, elem);
    }
    return queryplanOverlay;
}

function QueryplanOverlay() {
    this.content = ko.observable();
}

QueryplanOverlay.prototype.close = function () {
    this.content(null);
};

QueryplanOverlay.prototype.show = function (content) {
    this.content(content);
};

function handleQueryplanPreviewClick(e) {
    var previewElem = this;
    var ownerDocument = previewElem.ownerDocument;
    var queryplanElem = previewElem.cloneNode(true);

    getQueryplanOverlay(ownerDocument).show(queryplanElem);
}


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
