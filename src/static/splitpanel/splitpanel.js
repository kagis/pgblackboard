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
