var ko = require('knockout'),
    CodeMirror = require('codemirror');

module.exports.codeEditorDocExtender = function (target) {
    ko.utils.extend(target, {
        codemirrorDoc: new CodeMirror.Doc(target.peek() || '', 'text/x-pgsql'),
        errors: ko.observableArray(),
        selectionRange: ko.observable()
    });

    target.codemirrorDoc.on('change', function () {
        target(target.codemirrorDoc.getValue());
    });

    target.codemirrorDoc.on('cursorActivity', function () {
        var codemirrorInst = target.codemirrorDoc.getEditor();
        var selStart = codemirrorInst.getCursor(true),
            selEnd   = codemirrorInst.getCursor(false);

        target.selectionRange(
            codemirrorInst.somethingSelected() ?
            [[selStart.line, selStart.ch],
             [  selEnd.line,   selEnd.ch]] : null);
    });

    target.subscribe(function (value) {
        if (target.codemirrorDoc.getValue() !== value) {
            target.codemirrorDoc.setValue(value);
        }
    });

    return target;
};

module.exports.codeEditorBindingHandler = {
    'init': initCodemirror,
    'update': function (element, valueAccessor, allBindings) {
        var updatedDoc = allBindings.get('value'),
            codemirrorInst = element['__codemirror'];

        codemirrorInst.swapDoc(updatedDoc.codemirrorDoc);
    }
};

function initCodemirror(element, valueAccessor) {

    var codemirrorInst = CodeMirror.fromTextArea(element, {
        lineNumbers: true,
        matchBrackets: true,
        showCursorWhenSelecting: true,
        autoCloseBrackets: true,
        autofocus: true,
        mode: 'text/x-pgsql',
        keyMap: 'sublime',
        gutters: ['CodeMirror-linenumbers', 'errors-gutter']
    });

    element['__codemirror'] = codemirrorInst;

    window.codemirrorInst = codemirrorInst;


    // add gutter shadow when scrolled horizontal
    codemirrorInst.on('scroll', function () {
        ko.utils.toggleDomNodeCssClass(
            codemirrorInst.display.gutters,
            'CodeMirror-gutters--overlaying',
            codemirrorInst.getScrollInfo().left > 1
        );
    });


    // todo: codemirror refresh is expensive, do something
    //queryform.parentNode.addEventListener('resize', editor.refresh.bind(editor));
    //queryform.parentNode.parentNode.addEventListener('resize', editor.refresh.bind(editor));
    //window.addEventListener('resize', editor.refresh.bind(editor));

};


var setError = function (line, message) {
    var marker = document.createElement('div');
    marker.className = 'gutter-marker-error';
    marker.dataset.title = message;
    pgbb.editor.setGutterMarker(line, 'errors-gutter', marker);
};

