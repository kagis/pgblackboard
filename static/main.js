var model;

window.main = function () {

    makeSplitPanels();

    window.editor = initEditor();

    var model = window.model = new AppModel(editor);
    ko.applyBindings(model);
}



