ko.components.register('main', {
    template: 'main-tmpl',
    viewModel: Main,
    synchronous: true
});

/**
@constructor */
function Main(params) {
    this.isLightsOn = ko.observable(true);
    this.theme = ko.pureComputed(function () {
        return this.isLightsOn() ? 'light' : 'dark';
    }, this);

    this['myQueriesStorage'] = params.myQueriesStorage;
    this['databases'] = params.databases;
    this['selectedDocument'] = ko.observable(
        ko.observable(params.initialCode)
            .extend({ codeEditorDoc: true }));
}

Main.prototype['toggleTheme'] = function () {
    this.isLightsOn(!this.isLightsOn());
};


window['main'] = function (initialData) {
    ko.applyBindings({
        myQueriesStorage: window.localStorage,
        databases: initialData['databases'],
        initialCode: window.location.hash
    });
};



pgbb.initResult = function (resultWindow) {
    resultWindow.pgbb = pgbb;
    ko.computed(function () {
        ko.utils.toggleDomNodeCssClass(
            resultWindow.document.body,
            'light',
            pgbb.model.isLightsOn()
        );

        ko.utils.toggleDomNodeCssClass(
            resultWindow.document.body,
            'dark',
            !pgbb.model.isLightsOn()
        );
    });
};
