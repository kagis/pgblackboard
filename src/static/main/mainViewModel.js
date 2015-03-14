var ko = require('knockout');

module.exports = Main;

/**
@constructor */
function Main(params) {
    this.lightsAreOn = ko.observable(true);

    this['myQueriesStorage'] = params.myQueriesStorage;
    this['databases'] = params.databases;
    this['selectedDoc'] = ko.observable(
        ko.observable(params.initialCode)
            .extend({ codeEditorDoc: true }));
}

Main.prototype['toggleTheme'] = function () {
    this.lightsAreOn(!this.lightsAreOn());
};


window['main'] = function (initialData) {
    ko.applyBindings({
        myQueriesStorage: window.localStorage,
        databases: initialData['databases'],
        initialCode: window.location.hash || 'select \'awesome\''
    });
};

ko.bindingHandlers['resetSrcBy'] = {
    'update': function (element, valueAccessor) {
        ko.unwrap(valueAccessor());
        element.src = 'about:blank';
    }
};

// pgbb.initResult = function (resultWindow) {
//     resultWindow.pgbb = pgbb;
//     ko.computed(function () {
//         ko.utils.toggleDomNodeCssClass(
//             resultWindow.document.body,
//             'light',
//             pgbb.model.lightsAreOn()
//         );

//         ko.utils.toggleDomNodeCssClass(
//             resultWindow.document.body,
//             'dark',
//             !pgbb.model.lightsAreOn()
//         );
//     });
// };
