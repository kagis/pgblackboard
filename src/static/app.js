var ko = require('knockout');

ko.utils.objectForEach({

    'x-main'         : require('./main/mainComponent'),
    'x-codeform'     : require('./codeform/codeformComponent'),
    'x-nav'          : require('./nav/navComponent'),
    'x-myqueries'    : require('./nav/myqueries/myqueriesComponent'),
    'x-tree'         : require('./nav/tree/treeComponent'),
    'x-splitpanel-h' : require('./splitpanel/splitpanelHComponent'),
    'x-splitpanel-v' : require('./splitpanel/splitpanelVComponent'),

}, ko.components.register);

var codeEditorAdapt = require('./codeform/codemirror/codemirror-adapt');
ko.bindingHandlers['codeEditor'] = codeEditorAdapt.codeEditorBindingHandler;
ko.extenders.codeEditorDoc = codeEditorAdapt.codeEditorDocExtender;

ko.applyBindings(require('./rootBindingContext'));
