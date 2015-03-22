var ko = require('knockout');
var CodeMirror = require('codemirror');

module.exports = function (target) {
    var codemirrorDoc = new CodeMirror.Doc(target.peek() || '', 'text/x-pgsql');

    // use quoted keys to prevent properties conflict
    // after closure compiler rename
    ko.utils.extend(target, {
        'codemirrorDoc': codemirrorDoc,
        'errors': ko.observableArray(),
        'selectionRange': ko.observable()
    });

    codemirrorDoc.on('change', function () {
        target(codemirrorDoc.getValue());
    });

    codemirrorDoc.on('beforeSelectionChange', function (_, params) {
        var range = params['ranges'][0];
        target['selectionRange']([
            [range['anchor']['line'], range['anchor']['ch']],
            [range['head']['line'], range['head']['ch']]
        ]);
    });

    target.subscribe(function (value) {
        if (codemirrorDoc.getValue() !== value) {
            codemirrorDoc.setValue(value);
        }
    });

    target['errors'].subscribe(function (changes) {
        changes.forEach(setError);
    }, null, 'arrayChange');

    function setError(change) {
        if ('moved' in change) {
            return;
        }

        var codemirrorInst = codemirrorDoc.getEditor();
        if (!codemirrorInst) {
            return;
        }

        switch (change.status) {
        case 'added':
            var marker = document.createElement('div');
            marker.className = 'CodeMirror__error-gutter-marker';
            marker.dataset.title = change.value.message;
            codemirrorInst.setGutterMarker(change.value.line,
                                           'CodeMirror__annotations-gutter',
                                           marker);
            break;
        case 'deleted':
            codemirrorInst.setGutterMarker(change.value.line,
                                           'CodeMirror__annotations-gutter',
                                           null);
            break;
        }
    }

    return target;
};
