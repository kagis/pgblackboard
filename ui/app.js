var ko = require('knockout');
var flatBindingProvider = require('./knockout-flatbind');

ko.utils.objectForEach({

    // Using x- prefix because knockout registers
    // custom elements for components and custom element name
    // must contain hyphen http://www.w3.org/TR/custom-elements/#concepts

    'x-main': require('./components/main/main-component'),
    'x-codeform': require('./components/codeform/codeform-component'),
    'x-nav': require('./components/nav/nav-component'),
    'x-myqueries': require('./components/myqueries/myqueries-component'),
    'x-tree': require('./components/tree/tree-component'),
    'x-splitpanel-h': require('./components/splitpanel/splitpanel-h/splitpanel-h-component'),
    'x-splitpanel-v': require('./components/splitpanel/splitpanel-v/splitpanel-v-component'),

}, ko.components.register);

var codeEditorBinding = require('./components/codeform/codemirror/codeeditor-binding');
var codeEditorDocExtender = require('./components/codeform/codemirror/codeeditordoc-extender');

ko.utils.extend(ko.bindingHandlers, {
    'codeEditor': codeEditorBinding,
    'outputFrame': require('./output/outputframe-binding'),
    'mod': require('./bindings/mod')
});

ko.utils.extend(ko.extenders, {
    codeEditorDoc: codeEditorDocExtender,
    persist: require('./components/main/persist-extender')
});

ko.bindingProvider.instance = new flatBindingProvider();

ko.applyBindings(require('./root-bindingctx'));
