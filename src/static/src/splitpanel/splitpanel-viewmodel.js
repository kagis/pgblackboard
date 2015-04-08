var ko = require('knockout');

module.exports = {
    horizontal: splitPanelViewModel(true /* horizontal */),
    vertical: splitPanelViewModel(false /* vertical */)
};

function splitPanelViewModel(isHorizontal) {
    function createViewModel(params, componentInfo) {
        var elemTemplateNodes = componentInfo['templateNodes'].filter(
            function (node) { return node.nodeType == 1; }
        );
        var panel1 = elemTemplateNodes[0];
        var panel2 = elemTemplateNodes[1];
        return new SplitPanel(panel1, panel2, isHorizontal);
    }

    return { 'createViewModel': createViewModel };
}

function SplitPanel(aPanelContent, bPanelContent, isHorizontal) {
    /** @expose */
    this.aPanelContent = aPanelContent;

    /** @expose */
    this.bPanelContent = bPanelContent;

    /** @expose */
    this.aPanelPos = ko.observable();

    /** @expose */
    this.bPanelPos = ko.observable();

    /** @expose */
    this.splitterPos = ko.observable();

    /** @expose */
    this.isSplitting = ko.observable(false);

    this.resize = (isHorizontal ? this.resizeV : this.resizeH);
}

/** @expose */
SplitPanel.prototype.beginSplit = function (_, e) {
    var splitterElem = e.target;
    var container = splitterElem.parentNode;
    var containerBounds = container.getBoundingClientRect();
    var splitterWidth = splitterElem.offsetWidth;
    var splitterHeight = splitterElem.offsetHeight;
    var that = this;

    if (splitterElem.setCapture) {
        splitterElem.setCapture();
    }
    this.isSplitting(true);
    window.addEventListener('mousemove', onSplitterMouseMove);
    window.addEventListener('mouseup', onSplitterMouseUp);
    e.preventDefault(); // disable text selection

    function onSplitterMouseMove(e) {
        that.resize(
            e.clientX,
            e.clientY,
            containerBounds,
            splitterWidth,
            splitterHeight
        );
        that.fireResize();
    }

    function onSplitterMouseUp(e) {
        that.isSplitting(false);
        if (splitterElem.releaseCapture) {
            splitterElem.releaseCapture();
        }
        window.removeEventListener('mousemove', onSplitterMouseMove);
        window.removeEventListener('mouseup', onSplitterMouseUp);
        that.fireResize();
    }
};

SplitPanel.prototype.resizeH = function (_, splitterY, containerBounds, __, splitterHeight) {
    splitterY -= containerBounds.top;
    if (splitterY <= splitterHeight) {
        this.aPanelPos({ bottom: '100%' });
        this.bPanelPos({ top: splitterHeight + 'px' });
        this.splitterPos({ top: 0, bottom: null });
    } else {
        var percentage = (splitterY / containerBounds.height) * 100;
        percentage = Math.max(0, Math.min(100, percentage));
        this.aPanelPos({ bottom: 100 - percentage + '%' });
        this.bPanelPos({ top: percentage + '%' });
        this.splitterPos({ top: null, bottom: 100 - percentage + '%' });
    }
};

SplitPanel.prototype.resizeV = function (splitterX, _, containerBounds, splitterWidth) {
    splitterX -= containerBounds.left;
    if (splitterX <= splitterWidth) {
        this.aPanelPos({ right: '100%' });
        this.bPanelPos({ left: splitterWidth + 'px' });
        this.splitterPos({ left: 0, right: null });
    } else {
        var percentage = (splitterX / containerBounds.width) * 100;
        percentage = Math.max(0, Math.min(100, percentage));
        this.aPanelPos({ right: 100 - percentage + '%' });
        this.bPanelPos({ left: percentage + '%' });
        this.splitterPos({ left: null, right: 100 - percentage + '%' });
    }
};

SplitPanel.prototype.fireResize = function () {
    ko.utils.triggerEvent(window.document, 'resize');
};
