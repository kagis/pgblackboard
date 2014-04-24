var model;

window.main = function () {

    makeSplitPanels();

    var sqleditor = window.sqleditor = ace.edit('code');
    sqleditor.setTheme('ace/theme/monokai');
    sqleditor.setFontSize(20);

    sqleditor.commands.addCommand({
        name: 'execute',
        bindKey: {win: 'F5',  mac: 'F5'},
        exec: function() {
            submitQuery();
        }
    });

    sqleditor.commands.addCommand({
        name: 'share',
        bindKey: {win: 'Ctrl-Shift-S',  mac: 'Ctrl-Shift-S'},
        exec: function() {
            prompt('Share this url', location.origin + location.pathname +
                '#' + encodeURIComponent(sqleditor.getValue()));
        }
    });

    var codeForm = document.getElementById('code-form');

    codeForm.onsubmit = function () {
        syncQueryInput();
        return true;
    };

    function syncQueryInput() {
        document.getElementById('query-input').value =
            sqleditor.getSelectedText() || sqleditor.getValue();
    }

    function submitQuery() {
        syncQueryInput();
        codeForm.submit();
    }


    model = {
        tree: new TreeNode(new Root()),
        queries: new Queries(),
    };

    ko.applyBindings(model);

    model.queries.load();
    model.tree.expand();


    if (location.hash) {
        model.queries.addBlank(decodeURIComponent(location.hash.slice(1)));
    }

}
