var ko = require('knockout');
var initTableOutput = require('./table/table');

module.exports = {
    'init': function (outputFrameEl, valueAccessor) {
        var bindingOptions = valueAccessor();
        var outputFrameContext = {

            /** @expose */
            isDark: bindingOptions['isDark'],

            /** @expose */
            setError: function (messageAndLine) {
                if (outputFrameContext.selectedDoc['errors']) {
                    outputFrameContext.selectedDoc['errors'].push(messageAndLine);
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

function setupOutputFrame(outputFrameEl, outputFrameContext, tableOrMap) {
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

    switch (tableOrMap) {
    case 'table':
        setupOutputFrameForTable(outputFrameEl, outputFrameContext);
        break;
    case 'map':
        setupOutputFrameForMap(outputFrameEl, outputFrameContext);
        break;
    }

}

function setupOutputFrameForTable(outputFrameEl, outputFrameContext) {
    outputFrameEl.contentWindow.document.write(
        '<style>' + window['pgBlackboard']['tableCss'] + '</style>'
    );
    initTableOutput(outputFrameEl.contentWindow);
}

function setupOutputFrameForMap(outputFrameEl, outputFrameContext) {

}
