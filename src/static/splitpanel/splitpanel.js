function initSplitter(splitter) {
    var panel1 = splitter.previousElementSibling;
    var panel2 = splitter.nextElementSibling;
    var splitpanel = splitter.parentNode;

    var isHorizontal = splitter.className.match(/\bsplitter-h\b/);
    var resize = isHorizontal ? resizeH : resizeV;

    var splitterHeight = splitter.offsetHeight;
    var splitterWidth = splitter.offsetWidth;
    var splitpanelBounds;

    splitter.addEventListener('mousedown', onSplitterMouseDown);

    var resizeEvt = document.createEvent('HTMLEvents');
    resizeEvt.initEvent('resize', false, false);


    function fireResize() {
        panel1.dispatchEvent(resizeEvt);
        panel2.dispatchEvent(resizeEvt);
    }


    function onSplitterMouseDown(e) {
        if ('setCapture' in splitter) {
            splitter.setCapture();
        }
        splitpanelBounds = splitpanel.getBoundingClientRect();
        window.addEventListener('mousemove', onSplitterMouseMove);
        window.addEventListener('mouseup', onSplitterMouseUp);
        splitpanel.className += ' splitting ' +
            (isHorizontal ? 'splitting-h' : 'splitting-v');
        e.preventDefault(); // disable text selection
    }

    function onSplitterMouseUp(e) {
        if ('releaseCapture' in splitter) {
            splitter.releaseCapture();
        }

        splitpanel.className = splitpanel.className
            .replace(/\bsplitting\b/, '')
            .replace(/\bsplitting-h\b/, '')
            .replace(/\bsplitting-v\b/, '')
            .trim();

        window.removeEventListener('mousemove', onSplitterMouseMove);
        window.removeEventListener('mouseup', onSplitterMouseUp);
        fireResize();
    }

    function onSplitterMouseMove(e) {
        resize(e.clientX, e.clientY);
        fireResize();
    }

    function resizeH(_, y) {
        y -= splitpanelBounds.top;
        if (y <= splitterHeight) {
            panel1.style.bottom = '100%';
            panel2.style.top = splitterHeight + 'px';
            splitter.style.top = 0;
            splitter.style.bottom = null;
        } else {
            var percentage = (y / splitpanelBounds.height) * 100;
            percentage = Math.max(0, Math.min(100, percentage));
            panel1.style.bottom = 100 - percentage + '%';
            panel2.style.top = percentage + '%';
            splitter.style.top = null;
            splitter.style.bottom = 100 - percentage + '%';
        }
    }

    function resizeV(x, _) {
        x -= splitpanelBounds.left;
        if (x <= splitterWidth) {
            panel1.style.right = '100%';
            panel2.style.left = splitterWidth + 'px';
            splitter.style.left = 0;
            splitter.style.right = null;
        } else {
            var percentage = (x / splitpanelBounds.width) * 100;
            percentage = Math.max(0, Math.min(100, percentage));
            panel1.style.right = 100 - percentage + '%';
            panel2.style.left = percentage + '%';
            splitter.style.left = null;
            splitter.style.right = 100 - percentage + '%';
        }
    }
}


ko.bindingHandlers['splitter'] = {
    'init': function (element) {
        initSplitter(element);
    }
};

function SplitPanel(aPanelContent, bPanelContent, isHorizontal) {
    this.aPanelContent = aPanelContent;
    this.aPanelPos = ko.observable();
    this.bPanelContent = bPanelContent;
    this.bPanelPos = ko.observable();
    this.splitterPos = ko.observable();
    this.isSplitting = ko.observable(false);
    this.resize = (isHorizontal ? this.resizeV : this.resizeH);
}

SplitPanel.prototype.beginSplit = function (_, e) {
    var splitterElem = e.target;
    var container = splitterElem.parentNode;
    var containerBounds = container.getBoundingClientRect();
    var splitterWidth = splitterElem.offsetWidth;
    var splitterHeight = splitterElem.offsetHeight;
    var that = this;

    if ('setCapture' in splitterElem) {
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
        if ('releaseCapture' in splitterElem) {
            splitterElem.releaseCapture();
        }
        window.removeEventListener('mousemove', onSplitterMouseMove);
        window.removeEventListener('mouseup', onSplitterMouseUp);
        that.fireResize();
    }
};

SplitPanel.prototype.resizeH = function (_, splitterY, containerBounds, _, splitterHeight) {
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

};


function splitPanelViewModel(isHorizontal){
    function createViewModel(params, componentInfo) {
        var elemTemplateNodes = componentInfo.templateNodes.filter(
            function (node) { return node.nodeType == 1; }
        );
        var panel1 = elemTemplateNodes[0];
        var panel2 = elemTemplateNodes[1];
        return new SplitPanel(panel1, panel2, isHorizontal);
    }

    return { createViewModel: createViewModel };
}

ko.components.register('h-splitpanel', {
    template: { element: 'h-splitpanel-tmpl' },
    viewModel: splitPanelViewModel(true /* horizontal */)
});

ko.components.register('v-splitpanel', {
    template: { element: 'v-splitpanel-tmpl' },
    viewModel: splitPanelViewModel(false /* vertical */)
});
