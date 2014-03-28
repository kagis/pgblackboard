var shieldEl = document.createElement('div');
shieldEl.className = 'shield';
document.body.appendChild(shieldEl);

(function () {
    var splitterEl = document.querySelector('.splitpanel-h > .splitter');
    var column = document.querySelector('.splitpanel-h > .splitfix');

    splitterEl.addEventListener('mousedown', function (e) {
        var xStart = e.clientX;
        var origWidth = column.offsetWidth;
        function handleSplitterMove(e) {
            column.style.width = origWidth + (e.clientX - xStart) + 'px';
            sqleditor.resize();
        }
        function handleSplitComplete() {
            document.removeEventListener('mousemove', handleSplitterMove);
            document.removeEventListener('mouseup', handleSplitComplete);
            document.body.classList.remove('splitting');
            sqleditor.resize();
        }
        document.body.classList.add('splitting');
        document.addEventListener('mousemove', handleSplitterMove);
        document.addEventListener('mouseup', handleSplitComplete);
    });
})();

(function () {
    var splitterEl = document.querySelector('.splitpanel-v > .splitter');
    var row = document.querySelector('.splitpanel-v > .splitfix');

    splitterEl.addEventListener('mousedown', function (e) {
        var yStart = e.clientY;
        var origHeight = row.offsetHeight;
        function handleSplitterMove(e) {
            row.style.height = origHeight - (e.clientY - yStart) + 'px';
            sqleditor.resize();
        }
        function handleSplitComplete() {
            document.removeEventListener('mousemove', handleSplitterMove);
            document.removeEventListener('mouseup', handleSplitComplete);
            document.body.classList.remove('splitting');
            sqleditor.resize();
        }
        document.body.classList.add('splitting');
        document.addEventListener('mousemove', handleSplitterMove);
        document.addEventListener('mouseup', handleSplitComplete);
    });
})();
