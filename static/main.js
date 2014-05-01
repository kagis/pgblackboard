var model;

window.main = function () {

    makeSplitPanels();

    var editor = window.editor = initEditor();
    editor.focus();

    var model = window.model = new AppModel(editor);
    ko.applyBindings(model);
}



