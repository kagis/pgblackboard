pgbb.initEditor = function () {
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
        editor.setValue(queryText, 1);
    }

    function submitQuery() {
        if (onSubmit()) {
            queryForm.submit();
        }
    }

    function onSubmit() {
        pgbb.clearQueryAnnotations();
        queryForm.elements.query.value = editor.getSelectedText() || editor.getValue();
    }

    var queryForm = document.getElementById('queryform');
    queryForm.onsubmit = onSubmit;

    return editor;
};

pgbb.queryAnnotations = [];

pgbb.addQueryAnnotation = function (anno) {
    pgbb.queryAnnotations.push(anno);
    pgbb.editor.renderer.setAnnotations(pgbb.queryAnnotations);
};

pgbb.clearQueryAnnotations = function () {
    pgbb.queryAnnotations = [];
    pgbb.editor.renderer.setAnnotations([]);
};
