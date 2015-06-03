var d3 = require('./d3');
var ko = require('knockout');
var queryplanTemplate = require('./queryplan-template.html');


ko.bindingHandlers['zoompan'] = {
    'init': function (paneElem, valueAccessor) {
        var pane;

        function update() {
            if (ko.unwrap(valueAccessor())) {
                pane = new QueryplanPane({
                    paneElem: paneElem,
                    viewportElem: paneElem.parentNode
                });
            } else {
                if (pane) {
                    pane.dispose();
                    pane = null;
                }
            }
        }

        ko.computed({
            read: update,
            disposeWhenNodeIsRemoved: paneElem
        });
    }
};

ko.bindingHandlers['queryplanPopup'] = {
    'init': function (targetElem, valueAccessor) {

        function setupPopup(ownerDocument) {
            var popupElem = ownerDocument.createElement('div');
            popupElem.className = 'queryplan-popup';
            ownerDocument.body.appendChild(popupElem);
            var popup = new QueryplanPopup(popupElem);
            ownerDocument.addEventListener('zoompan', popup.updatePosition.bind(popup));
            return popup;
        }

        function getPopup() {
            const popupProp = 'pgBlackboardQueryplanPopup';
            var ownerDocument = targetElem.ownerDocument;
            return ownerDocument[popupProp] || (
                ownerDocument[popupProp] = setupPopup(ownerDocument)
            );
        }
        var isCaptured = false;
        var hidePopupOnReleaseCapture = false;

        function onMouseDown(e) {
            if (e.which == 1) {
                isCaptured = true;
            }
        }

        function onMouseUp() {
            isCaptured = false;
            var popup = getPopup();
            popup.updatePosition();
            if (hidePopupOnReleaseCapture) {
                popup.hide();
            }
        }

        function onMouseEnter(e) {
            hidePopupOnReleaseCapture = false;
            if (!isCaptured) {
                var descElem = targetElem.getElementsByTagName('desc')[0];
                var popup = getPopup();
                popup.setContent(descElem.innerHTML);
                popup.showOn(targetElem);
            }
        }

        function onMouseLeave(e) {
            hidePopupOnReleaseCapture = true;
            if (!isCaptured) {
                var popup = getPopup();
                popup.hide();
            }
        }

        function update() {
            if (valueAccessor()) {
                targetElem.addEventListener('mouseenter', onMouseEnter);
                targetElem.addEventListener('mouseleave', onMouseLeave);
                targetElem.addEventListener('mousedown', onMouseDown);
                targetElem.addEventListener('mouseup', onMouseUp);
            } else {
                targetElem.removeEventListener('mouseenter', onMouseEnter);
                targetElem.removeEventListener('mouseleave', onMouseLeave);
                targetElem.removeEventListener('mousedown', onMouseDown);
                targetElem.removeEventListener('mouseup', onMouseUp);
            }
        }

        ko.computed({
            read: update,
            disposeWhenNodeIsRemoved: targetElem
        });
    }
};

module.exports = function emitQueryPlan(frameWindow, planTree) {
    var elemToBind = document.createElement('div');
    elemToBind.innerHTML = queryplanTemplate;
    ko.applyBindings(new QueryplanViewModel(planTree), elemToBind);

    frameWindow
        .document
        .currentScript
        .parentNode
        .appendChild(elemToBind);
};

/** @constructor */
function QueryplanViewModel(planTree) {
    var nodeWidth = 100;
    var nodeHeight = 30;
    var highHue = 20; /* deg */
    var lowHue = 90; /* deg */
    var hueDelta = highHue - lowHue;

    var treeLayout = d3.layout.tree().nodeSize([50, 1]);

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

    var preNodes = treeLayout
        .nodes(planTree)
        .map(function (it) {
            it.y = it.depth * 150;
            return it;
        });


    var diagonal = d3.svg.diagonal().projection(function (it) {
        return [it.y, it.x];
    });

    /** @export */
    this.edges = treeLayout
        .links(preNodes)
        .map(function (it) {
            return {
                /** @export */
                pathData: diagonal(it)
            }
        });

    /** @export */
    this.nodes = preNodes.map(function (it) {
        return {
            /** @export */
            x: it.y,
            /** @export */
            y: it.x,
            /** @export */
            name: it['typ'],
            /** @export */
            properties: dictToArrayOfNameAndValue(it['properties']),
            /** @export */
            fill: hsl(hueDelta * it['heat'] + lowHue, 100, 50),
            /** @export */
            width: nodeWidth,
            /** @export */
            height: nodeHeight
        };
    });

    var bounds = this.nodes.reduce(
        function (acc, it) {
            return {
                xmin: Math.min(it.x, acc.xmin),
                xmax: Math.max(it.x, acc.xmax),
                ymin: Math.min(it.y, acc.ymin),
                ymax: Math.max(it.y, acc.ymax)
            };
        },
        {
            xmin: Infinity,
            xmax: -Infinity,
            ymin: Infinity,
            ymax: -Infinity
        }
    );

    /** @export */
    this.viewBox = [
        bounds.xmin - nodeWidth / 2,
        bounds.ymin - nodeHeight / 2,
        bounds.xmax - bounds.xmin + nodeWidth,
        bounds.ymax - bounds.ymin + nodeHeight
    ];
    /** @export */
    this.width = bounds.xmax - bounds.xmin + nodeWidth;
    /** @export */
    this.height = bounds.ymax - bounds.ymin + nodeHeight;

    /** @export */
    this.isFullPageView = ko.observable(false);
}

/** @expose */
QueryplanViewModel.prototype.enterFullPageMode = function () {
    this.isFullPageView(true);
};

/** @expose */
QueryplanViewModel.prototype.leaveFullPageMode = function () {
    this.isFullPageView(false);
};


/** @constructor */
function QueryplanPopup(popupElem) {
    this.currentTarget = null;
    this.popupElem = popupElem;
}

QueryplanPopup.prototype.showOn = function (target) {
    this.currentTarget = target;
    this.popupElem.style.display = 'block';
    this.updatePosition();
};

QueryplanPopup.prototype.updatePosition = function () {
    if (!this.currentTarget) {
        return;
    }
    var targetBBox = this.currentTarget.getBoundingClientRect();
    var top = targetBBox.top;
    var left = targetBBox.left + targetBBox.width / 2;
    // setCssTransform(this.popupElem, 'translate(' + left + 'px,' + top + 'px)');

    this.popupElem.style.top =  top + 'px';
    this.popupElem.style.left = left + 'px';
};

QueryplanPopup.prototype.hide = function () {
    this.currentTarget = null;
    this.popupElem.style.display = 'none';
};

QueryplanPopup.prototype.setContent = function (content) {
    this.popupElem.innerHTML = content;
};


/** @constructor */
function QueryplanPane(options) {
    this.paneElem = options.paneElem;
    this.viewportElem = options.viewportElem;
    this.translateX = 0;
    this.translateY = 0;
    this.zoom = 0;
    this.isPanning = false;

    this.handleViewportMouseDown = this.handleViewportMouseDown.bind(this);
    this.handleViewportWheel = this.handleViewportWheel.bind(this);

    this.viewportElem.addEventListener(
        'mousedown',
        this.handleViewportMouseDown,
        true
    );

    this.viewportElem.addEventListener(
        'wheel',
        this.handleViewportWheel,
        true
    );
}

QueryplanPane.prototype.dispose = function () {
    this.viewportElem.removeEventListener(
        'mousedown',
        this.handleViewportMouseDown,
        true
    );

    this.viewportElem.removeEventListener(
        'wheel',
        this.handleViewportWheel,
        true
    );

    setCssTransform(this.paneElem, null);
};

QueryplanPane.prototype.minZoom = -20;

QueryplanPane.prototype.maxZoom = 20;

QueryplanPane.prototype.zoomFactor = .1;

QueryplanPane.prototype.applyTransform = function () {
    setCssTransform(this.paneElem,
        'translate(' +
            this.translateX + 'px,' +
            this.translateY + 'px)' +
        'scale(' + this.getScale() + ')'
    );
    ko.utils.triggerEvent(this.paneElem.ownerDocument, 'zoompan');
};

QueryplanPane.prototype.setZoomClipped = function (unclippedZoom) {
    this.zoom = Math.min(this.maxZoom, Math.max(this.minZoom, unclippedZoom));
};

QueryplanPane.prototype.getScale = function () {
    return Math.exp(this.zoom * this.zoomFactor);
};

QueryplanPane.prototype.handleViewportMouseDown = function (e) {
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

QueryplanPane.prototype.handleViewportWheel = function (e) {
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

var transformProperty = [
    'transform',
    'webkitTransform',
    'MozTransform',
    'msTransform'
].filter(function (prop) {
    return prop in document.body.style;
})[0];

function setCssTransform(elem, value) {
    elem.style[transformProperty] = value;
}
