var ko = require('knockout');

module.exports = Main;

/**
 * @constructor
 */
function Main(params) {
    this['isDark'] =
    this.isDark = ko.observable().extend({
        persist: 'pgblackboard_isdark'
    });

    this['myQueriesStorage'] = params.myQueriesStorage;
    this['databases'] = params.databases;

    var initialDoc = ko.observable(params.initialCode).extend({
        codeEditorDoc: true
    });

    this['selectedDoc'] = ko.observable(initialDoc);
}

Main.prototype['toggleTheme'] = function () {
    this.isDark(!this.isDark());
};

Main.prototype['onCodeFormSubmit'] = function () {
    if (this['selectedDoc']()['errors']) {
        this['selectedDoc']()['errors'].removeAll();
    }
    return true;
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
