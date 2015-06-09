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

    function trackDocChange() {
        codemirrorDoc.on('change', function () {
            target(codemirrorDoc.getValue());
        });
    }

    if (target() == undefined /* not ready */) {
        var readySubscription = target.subscribe(function () {
            readySubscription.dispose();
            trackDocChange();
        }, null, 'ready');
    } else {
        trackDocChange();
    }

    codemirrorDoc.on('beforeSelectionChange', function (_, params) {
        var range = params['ranges'][0];
        target['selectionRange']({
            anchorLine: range['anchor']['line'],
            anchorCol: range['anchor']['ch'],
            headLine: range['head']['line'],
            headCol: range['head']['ch']
        });
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
            codemirrorInst.setGutterMarker(change.value['line'],
                                           'CodeMirror__annotations-gutter',
                                           marker);
            break;
        case 'deleted':
            codemirrorInst.setGutterMarker(change.value['line'],
                                           'CodeMirror__annotations-gutter',
                                           null);
            break;
        }
    }

    return target;
};
