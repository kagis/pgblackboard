function initEditor() {
    var editor = ace.edit('editor');
    editor.getSession().setMode('ace/mode/pgsql');
    editor.setTheme('ace/theme/monokai');
    editor.setValue("\\connect postgres\nselect 'hello, ' || current_user;\n", 1);
    editor.setFontSize(20);

    editor.commands.addCommand({
        name: 'execute',
        bindKey: { win: 'F5', mac: 'F5' },
        exec: function() {
            submitQuery();
        }
    });

    editor.commands.addCommand({
        name: 'share',
        bindKey: { win: 'Ctrl-Shift-S',  mac: 'Ctrl-Shift-S' },
        exec: function() {
            prompt('Share this url', location.origin + location.pathname +
                '#' + encodeURIComponent(editor.getValue()));
        }
    });

    // load query from hash
    if (location.hash) {
        var encodedQueryText = location.hash.slice(1); // trim #
        var queryText = decodeURIComponent(encodedQueryText);
        editor.setValue(queryText);
    }

    function submitQuery() {
        if (onSubmit()) {
            queryForm.submit();
        }
    }

    function onSubmit() {
        var queryText = editor.getValue();
        var m = /^\s*\\connect\s+(\w+)([\s\S]*)/m.exec(queryText);
        if (m) {
            queryForm.elements.database.value = m[1];
            queryForm.elements.query.value = editor.getSelectedText() || m[2];
            editor.renderer.setAnnotations([]);
        } else {
            editor.renderer.setAnnotations([{
                row: 0,
                column: 0,
                text: '"\\connect dbname" expected on first line',
                type: 'error'
            }]);
        }
        return !!m;
    }

    var queryForm = document.getElementById('queryform');
    queryForm.onsubmit = onSubmit;

    return editor;
}
