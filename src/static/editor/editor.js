function EditorForm(doc) {
    this.doc = ko.observable(doc);
    this.isLoading = ko.pureComputed(function () {
        return this.doc().isLoading && this.doc().isLoading();
    }, this);

    this.editorOptions = {
        value: value
    };
}

function EditorDoc(text) {
    this.text = ko.observable(text);
    this.isLoading = ko.observable(false);
    this.errors = ko.observableArray();
    this._codemirrorDoc = new CodeMirror.Doc(target.peek(), 'text/x-pgsql');
}

ko.extenders['editorDoc'] = function (target) {
    var doc = new CodeMirror.Doc(target.peek(), 'text/x-pgsql');
    target.codemirrorDocument = doc;
    doc.on('change', function () {
        target(doc.getValue());
    });
    ko.computed(function () {
        doc.setValue(target());
    });
    return target;
};


ko.bindingHandlers['codemirrorDoc'] = {
    'init': initCodemirror
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


