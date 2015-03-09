ko.extenders.codeEditorDoc = function (target) {
    ko.utils.extend(target, {
        codemirrorDoc: new CodeMirror.Doc(target.peek() || '', 'text/x-pgsql'),
        isReady: ko.observable(false),
        errors: ko.observableArray(),
        selectionRange: ko.observable()
    });

    target.codemirrorDoc.on('change', function () {
        target(target.codemirrorDoc.getValue());
    });

    target.subscribe(function (value) {
        if (target.codemirrorDoc.getValue() !== value) {
            target.codemirrorDoc.setValue(value);
        }
    });

    if (typeof target.peek() === 'undefined') {
        // set isReady to true when 'ready' topic triggered
        target.subscribe(
            target.isReady.bind(null, true),
            null,
            'ready');
    } else {
        target.isReady(true);
    }

    return target;
};

ko.bindingHandlers['codeEditorWidget'] = {
    'init': initCodemirror,
    'update': function (element, valueAccessor) {
        var updatedDoc = ko.unwrap(ko.unwrap(valueAccessor()).doc),
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

    codemirrorInst.on('change', function () {
        element.value = codemirrorInst.getValue();
    });

    function onSubmit() {
        editor.clearGutter('errors-gutter');
        var selStart = editor.getCursor(true),
            selEnd   = editor.getCursor(false);
        queryform.elements.selection.value = editor.somethingSelected() ?
            JSON.stringify([[selStart.line, selStart.ch],
                            [  selEnd.line,   selEnd.ch]]) : null;
    }

    //var queryform = document.getElementById('queryform');
    //queryform.onsubmit = onSubmit;


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

