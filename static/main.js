var model;

window.main = function () {

    makeSplitPanels();

    var editor = window.editor = ace.edit('editor');
    editor.getSession().setMode('ace/mode/pgsql');
    editor.setTheme('ace/theme/monokai');
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
        syncQueryInput();
        queryForm.submit();
    }

    function onSubmit() {
        syncQueryInput();
        return true;
    }

    function syncQueryInput() {
        queryInput.value = editor.getSelectedText() || editor.getValue();
    }

    var queryInput = document.getElementById('queryinput');
    var queryForm = document.getElementById('queryform');
    queryForm.onsubmit = onSubmit;





    var model = window.model = new AppModel(editor);
    ko.applyBindings(model);
}



