var CodeMirror = {
	fromTextArea: function (elem) {},
	defineMIME: function (mimeType, options) {},
	swapDoc: function (doc) {},

    /** @return {{left: number, top: number}} */
    getScrollInfo: function () {},

    setGutterMarker: function (line, gutterName, markerElem) {},

    display: {
        gutters: {}
    },

	Doc: {
		getValue: function () {},
		setValue: function () {},
        getEditor: function () {},
		on: function () {}
	}
};
