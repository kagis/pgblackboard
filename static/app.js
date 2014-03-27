var sqleditor = ace.edit('code');
sqleditor.setOptions({
    enableBasicAutocompletion: true
});
sqleditor.setTheme("ace/theme/monokai");
sqleditor.setFontSize(20);

sqleditor.commands.addCommand({
    name: 'execute',
    bindKey: {win: 'F5',  mac: 'Ctrl-Shift-E'},
    exec: function() {
        submitQuery()
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



var model = ko.track({
    tree: new TreeNode(new Root()),
    queries: new Queries(),
});



ko.applyBindings(model);

model.queries.load();
model.tree.expand();
