// load query from hash
if (location.hash) {
    document.getElementById('query').value =
        decodeURIComponent(location.hash.slice(1));
}

// show share link on alt+x
document.getElementById('share-action').addEventListener('click', function () {
    prompt('Share this url', location.origin + location.pathname +
        '#' + encodeURIComponent(pgbb.editor.getValue()));
});


pgbb.initEditor = function () {
    var editor = CodeMirror.fromTextArea(document.getElementById('query'), {
        lineNumbers: true,
        matchBrackets: true,
        showCursorWhenSelecting: true,
        autoCloseBrackets: true,
        autofocus: true,
        mode: 'text/x-mysql',
        keyMap: 'sublime',
        theme: 'monokai',
        gutters: ['CodeMirror-linenumbers', 'errors-gutter']
    });

    function onSubmit() {
        editor.clearGutter('errors-gutter');
        var selStart = editor.getCursor(true),
            selEnd   = editor.getCursor(false);
        queryform.elements.selection.value = editor.somethingSelected() ?
            JSON.stringify([[selStart.line, selStart.ch],
                            [  selEnd.line,   selEnd.ch]]) : null;
    }

    var queryform = document.getElementById('queryform');
    queryform.onsubmit = onSubmit;
    function fitEditorSize() {
        editor.setSize(queryform.clientWidth, queryform.clientHeight);
    }
    queryform.addEventListener('resize', fitEditorSize);
    queryform.parentNode.addEventListener('resize', fitEditorSize);
    window.addEventListener('resize', fitEditorSize);

    fitEditorSize();

    return editor;
};


pgbb.setError = function (line, message) {
    var marker = document.createElement('div');
    marker.className = 'gutter-marker-error';
    marker.dataset.title = message;
    pgbb.editor.setGutterMarker(line, 'errors-gutter', marker);
};
