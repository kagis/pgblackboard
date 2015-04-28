var ko = require('knockout');
var initTableOutput = require('./table/table');
// var setupOutputFrameForMap = require ('./map/map');

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
            },

            selectedDoc: null
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
        setupOutputFrameForTable(outputFrameEl.contentWindow, outputFrameContext);
        break;
    case 'map':
        outputFrameEl.contentWindow.document.write('<script src="bundle-map.js"></script>');
        // setupOutputFrameForMap(outputFrameEl.contentWindow, outputFrameContext);
        break;
    }

}

function setupOutputFrameForTable(frameWindow, outputFrameContext) {
    frameWindow.document.write(
        '<style>' + window['pgBlackboard']['tableCss'] + '</style>'
    );
    initTableOutput(frameWindow);
}

