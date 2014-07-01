(function () {

function splitpanel(splitpanelEl, orientation) {
    var splitterEl = splitpanelEl.querySelector('.splitter');
    var fixedPanelEl = splitpanelEl.querySelector('.splitfix');
    splitterEl.addEventListener('mousedown', function (e) {
        var start;
        var handleSplitterMove;
        if (orientation === 'horizontal') {
            start = fixedPanelEl.offsetWidth - e.clientX;
            handleSplitterMove = function (e) {
                fixedPanelEl.style.width = start + e.clientX + 'px';
            }
        } else {
            start = fixedPanelEl.offsetHeight + e.clientY;
            handleSplitterMove = function (e) {
                fixedPanelEl.style.height = start - e.clientY + 'px';
            }
        }

        function handleSplitComplete() {
            document.removeEventListener('mousemove', handleSplitterMove);
            document.removeEventListener('mouseup', handleSplitComplete);
            document.body.classList.remove('splitting');
            editor.resize();
        }

        document.body.classList.add('splitting');
        document.addEventListener('mousemove', handleSplitterMove);
        document.addEventListener('mouseup', handleSplitComplete);
    });
}

var shieldEl = document.createElement('div');
shieldEl.className = 'splitshield';
document.body.appendChild(shieldEl);

splitpanel(document.querySelector('.splitpanel-h'), 'horizontal');
splitpanel(document.querySelector('.splitpanel-v'), 'vertical');

})();
