var ko = require('knockout');

module.exports = {
    'init': function (outputFrameEl, valueAccessor) {
        var bindingOptions = valueAccessor();
        var outputFrameContext = {
            'isDark': bindingOptions['isDark'],
            'setError': function (messageAndLine) {
                if (this.selectedDoc['errors']) {
                    this.selectedDoc['errors'].push(messageAndLine);
                }
            }
        };

        outputFrameEl['setupPgBlackboardOutputFrame'] =
            setupOutputFrame.bind(outputFrameEl,
                                  outputFrameEl,
                                  outputFrameContext);

        ko.computed(function () {
            outputFrameContext.selectedDoc = ko.unwrap(bindingOptions['doc']);
            outputFrameEl.src = 'about:blank';
        });
    }
};

function setupOutputFrame(outputFrameEl, outputFrameContext) {
    outputFrameEl.contentWindow['pgBlackboard'] = outputFrameContext;

    var themeComputed = ko.computed(function () {
        ko.utils.toggleDomNodeCssClass(
            outputFrameEl.contentWindow.document.body,
            'dark',
             outputFrameContext.isDark()
        );
    });

    ko.utils.registerEventHandler(outputFrameEl.contentWindow, 'beforeunload', function () {
        themeComputed.dispose();
    });
}
