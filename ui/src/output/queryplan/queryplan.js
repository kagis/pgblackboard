var d3 = require('./d3');
var ko = require('knockout');
var queryplanOverlayTemplate = require('./queryplan-overlay-template.html');
var queryplanTemplate = require('./queryplan-template.html');
var queryplanPreviewTemplate = require('./queryplan-preview-template.html');


ko.bindingHandlers['zoompan'] = {
    'init': function (elem) {
        new Pane({
            paneElem: elem,
            viewportElem: elem.parentNode
        });
    }
};


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

    setupQueryplanPreviewClickHandler(frameWindow);




    var queryplanSVGMarkup = renderQueryplanSVG(plan);

    frameWindow.document.write(`
        <div class="queryplan-preview">${queryplanSVGMarkup}</div>
    `);

    // queryplanEl.addEventListener('click', handleQueryplanPreviewClick);

    /*function queryplanClick() {
        queryplanEl.removeEventListener('click', queryplanClick);
        ko.utils.toggleDomNodeCssClass(queryplanEl, 'queryplan--focused', true);

        var pane = new Pane({
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

    // frameWindow.document['currentScript'].parentNode.appendChild(queryplanEl);
};

var queryplanIsInitialized = false;
function setupQueryplanPreviewClickHandler(frameWindow) {
    if (queryplanIsInitialized) { return; }
    queryplanIsInitialized = true;

    frameWindow.addEventListener(
        'click',
        handleQueryplanPreviewClick,
        true);

    var popupElem = frameWindow.document.createElement('div');
    popupElem.className = 'queryplan__popup';
    frameWindow.document.body.appendChild(popupElem);

    var popup = new SVGPopup(popupElem);

    frameWindow.addEventListener('mouseover', function (e) {
        var elem = e.target;
        do {
            if (hasClass(elem, 'queryplan__node')) {
               popup.setContent(elem.getElementsByTagName('desc')[0].innerHTML);
               popup.showOn(elem);
            }
        } while (elem = elem.parentNode);
    });

    frameWindow.addEventListener('mouseout', function (e) {
        var elem = e.target;
        do {
            if (hasClass(elem, 'queryplan__node')) {
               popup.hide();
            }
        } while (elem = elem.parentNode);
    });
}

function handleQueryplanPreviewClick (e) {
    var elem = e.target;
    do {
        if (hasClass(elem, 'queryplan-preview')) {
            // ko.utils.toggleDomNodeCssClass(
            //     elem,
            //     'queryplan-preview--overlayed',
            //     true
            // );
            showQueryplanOverlay(elem.children[0]);
        }
    } while (elem = elem.parentNode);
};

// function delegate(elemToListenOn, eventName, className, handler) {
//     elemToListenOn.addEventListener(eventName, function () {

//     }, true);
// }



function hasClass(elem, testingClassName) {
    if (typeof elem.classList === 'object') {
        return elem.classList.contains(testingClassName);
    }

    var classNames = elem.className;
    if (typeof classNames === 'object' &&
        typeof classNames['baseVal'] === 'string')
    {
        classNames = classNames['baseVal'];
    }

    if (typeof classNames === 'string') {
        return classNames.match(new RegExp('\\b' + testingClassName + '\\b'));
    }

    return false;
}

function showQueryplanOverlay(queryplanElem) {
    var ownerDocument = queryplanElem.ownerDocument;

    getQueryplanOverlay(ownerDocument)
        .show(queryplanElem.outerHTML);
}

function renderQueryplanSVG(plan) {
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

    var xmax = nodes.map(function (it) { return it.y; })
                    .reduce(function (a, b) { return Math.max(a, b); });

    var xmin = nodes.map(function (it) { return it.y; })
                    .reduce(function (a, b) { return Math.min(a, b); });

    var ymax = nodes.map(function (it) { return it.x; })
                    .reduce(function (a, b) { return Math.max(a, b); });

    var ymin = nodes.map(function (it) { return it.x; })
                    .reduce(function (a, b) { return Math.min(a, b); });

    var nodeWidth = 100;
    var nodeHeight = 30;
    var elem = document.createElement('div');
    elem.innerHTML = queryplanTemplate;
    ko.applyBindings({
        'nodes': nodes.map(function (n) {
            var highHue = 20; /* deg */
            var lowHue = 90; /* deg */
            var hueDelta = highHue - lowHue;
            var hue = hueDelta * n['heat'] + lowHue;
            var properties = n['properties'];
            var propertiesPairs = [];
            for (var propName in properties) {
                propertiesPairs.push({
                    'name': propName,
                    'value': properties[propName]
                });
            }
            return {
                'x': n.y,
                'y': n.x,
                'name': n['typ'],
                'properties': propertiesPairs,
                'fill': 'hsl(' + hue + ', 100%, 50%)',
                'width': nodeWidth,
                'height': nodeHeight
            };
        }),
        'edges': links.map(function (d) {
            return {
                'pathData': diagonal(d)
            };
        }),
        'viewBox': [
            xmin - nodeWidth / 2,
            ymin - nodeHeight / 2,
            xmax - xmin + nodeWidth,
            ymax - ymin + nodeHeight
        ],
        'width': xmax - xmin + nodeWidth,
        'height': ymax - ymin + nodeHeight
    }, elem);

    return elem.children[0].outerHTML;
}

// function QueryPlan() {
//     this.viewBox = [
//     ];
//     this.nodes = nodes;
//     this.edges = edges;
// }


function getQueryplanOverlay(ownerDocument) {
    if (!ownerDocument['pgBlackboardQueryplanOverlay']) {
        var queryplanOverlay = new QueryplanOverlay();
        var elem = ownerDocument.createElement('div');
        elem.innerHTML = queryplanOverlayTemplate;
        ko.applyBindings(queryplanOverlay, elem);
        ownerDocument.body.appendChild(elem.children[0]);
        ownerDocument['pgBlackboardQueryplanOverlay'] = queryplanOverlay;
    }
    return ownerDocument['pgBlackboardQueryplanOverlay'];
}

function QueryplanOverlay() {

    /** @expose */
    this.content = ko.observable();
}

/** @expose */
QueryplanOverlay.prototype.close = function () {
    this.content(null);
};

QueryplanOverlay.prototype.show = function (content) {
    this.content(content);
};

// function handleQueryplanPreviewClick(e) {
//     var previewElem = this;
//     var ownerDocument = previewElem.ownerDocument;
//     var queryplanElem = previewElem.cloneNode(true);

//     getQueryplanOverlay(ownerDocument).show(queryplanElem.outerHTML);
// }


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
function Pane(options) {
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

Pane.prototype.minZoom = -20;

Pane.prototype.maxZoom = 20;

Pane.prototype.zoomFactor = .1;

// Pane.prototype.center = function () {
//     var paneBBox = this.paneElem.getBBox();
//     var viewportSize = this.viewportElem.getBoundingClientRect();
//     this.translateX = (viewportSize.width - paneBBox.width) / 2 - paneBBox.x;
//     this.translateY = (viewportSize.height - paneBBox.height) / 2 - paneBBox.y;
//     this.applyTransform();
// };


Pane.prototype.applyTransform = function () {
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

Pane.prototype.setZoomClipped = function (unclippedZoom) {
    this.zoom = Math.min(this.maxZoom, Math.max(this.minZoom, unclippedZoom));
};

Pane.prototype.getScale = function () {
    return Math.exp(this.zoom * this.zoomFactor);
};

Pane.prototype.handleViewportMouseDown = function (e) {
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

Pane.prototype.handleViewportWheel = function (e) {
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
