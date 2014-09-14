pgbb.extend = ko.utils.extend;

pgbb.SplitPanel = function (el, orientation) {
    this._resizeFixedPanel = orientation === 'horizontal' ?
        this._resizeFixedPanelHorizontal : this._resizeFixedPanelVertical;

    this._el = el;
    this._fixedPanelEl = el.querySelector('.splitfix');

    this._panel1 = el.children[0];
    this._panel2 = el.children[2];

    el.querySelector('.splitter').addEventListener('mousedown', this._onSplitterMouseDown.bind(this));
};

pgbb.extend(pgbb.SplitPanel.prototype, {
    _resizeEvent: new Event('resize'),

    _fireResize: function () {
        this._panel1.dispatchEvent(this._resizeEvent);
        this._panel2.dispatchEvent(this._resizeEvent);
    },

    _onSplitterMouseDown: function (e) {
        this._startX = this._fixedPanelEl.offsetWidth - e.clientX;
        this._startY = this._fixedPanelEl.offsetHeight + e.clientY;
        this._onSplitterMouseUpBinded = this._onSplitterMouseUp.bind(this);
        this._onSplitterMouseMoveBinded = this._onSplitterMouseMove.bind(this);

        document.body.classList.add('splitting');
        document.addEventListener('mousemove', this._onSplitterMouseMoveBinded);
        document.addEventListener('mouseup', this._onSplitterMouseUpBinded);
    },

    _onSplitterMouseUp: function (e) {
        document.removeEventListener('mouseup', this._onSplitterMouseUpBinded);
        document.removeEventListener('mousemove', this._onSplitterMouseMoveBinded);
        document.body.classList.remove('splitting');
        this._fireResize();
    },

    _onSplitterMouseMove: function (e) {
        this._resizeFixedPanel(e.clientX, e.clientY);
        this._fireResize();
    },

    _resizeFixedPanelVertical: function (_, y) {
        this._fixedPanelEl.style.height = (this._startY - y) + 'px';
    },

    _resizeFixedPanelHorizontal: function (x, _) {
       this._fixedPanelEl.style.width = (this._startX + x) + 'px';
    }

});

var shieldEl = document.createElement('div');
shieldEl.className = 'splitshield';
document.body.appendChild(shieldEl);


new pgbb.SplitPanel(document.querySelector('.splitpanel-h'), 'horizontal');
new pgbb.SplitPanel(document.querySelector('.splitpanel-v'), 'vertical');
