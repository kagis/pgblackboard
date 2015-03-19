var ko = require('knockout');

ko.utils.objectForEach({

    'x-main'         : require('./main/main-component'),
    'x-codeform'     : require('./codeform/codeform-component'),
    'x-nav'          : require('./nav/nav-component'),
    'x-myqueries'    : require('./myqueries/myqueries-component'),
    'x-tree'         : require('./tree/tree-component'),
    'x-splitpanel-h' : require('./splitpanel/splitpanel-h/splitpanel-h-component'),
    'x-splitpanel-v' : require('./splitpanel/splitpanel-v/splitpanel-v-component'),

}, ko.components.register);

var codeEditorAdapt = require('./codeform/codemirror/codemirror-adapt');
ko.bindingHandlers['codeEditor'] = codeEditorAdapt.codeEditorBindingHandler;
ko.extenders.codeEditorDoc = codeEditorAdapt.codeEditorDocExtender;

ko.extenders.persist = require('./main/persist-extender');

ko.applyBindings(require('./root-bindingctx'));
