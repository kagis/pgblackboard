var ko = require('knockout');
var CodeMirror = require('codemirror');

require('codemirror/addon/search/searchcursor');
require('codemirror/keymap/sublime');
require('codemirror/addon/edit/matchbrackets');
require('codemirror/addon/edit/closebrackets');
require('codemirror/mode/sql/sql');
require('./codemirror-pgsql');

module.exports = {
    'init': initCodemirror
};

function initCodemirror(element, valueAccessor, allBindings) {
    var codemirrorInst = CodeMirror.fromTextArea(element, {
        'lineNumbers': true,
        'matchBrackets': true,
        'showCursorWhenSelecting': true,
        'autoCloseBrackets': true,
        'autofocus': true,
        'mode': 'text/x-pgsql',
        'keyMap': 'sublime',
        'gutters': [
            'CodeMirror-linenumbers',
            'CodeMirror__annotations-gutter'
        ]
    });

    window.codemirrorInst = codemirrorInst;

    // add gutter shadow when scrolled horizontal
    codemirrorInst.on('scroll', function () {
        ko.utils.toggleDomNodeCssClass(
            codemirrorInst.display.gutters,
            'CodeMirror-gutters--overlaying',
            codemirrorInst.getScrollInfo().left > 1
        );
    });

    ko.computed(function () {
        var updatedDoc = allBindings.get('value');
        codemirrorInst.swapDoc(updatedDoc['codemirrorDoc']);
    });
}
