var ko = require('knockout');

module.exports = CodeForm;

/**
 * @constructor
 * @param {{doc}} params
 */
function CodeForm(params) {
    this.doc = params['doc'];

    /** @expose */
    this.isLoading = ko.pureComputed(this.checkIsLoading, this);

    /** @expose */
    this.readyDoc = ko.computed(this.getReadyDoc, this);

    var selectionRange = ko.pureComputed(function () {
        var selectionRange = this.readyDoc() &&
                            this.readyDoc()['selectionRange']() || {};
        return selectionRange.anchorLine === selectionRange.headLine &&
               selectionRange.anchorCol === selectionRange.headCol ?
               {} : selectionRange;
    }, this);


    /** @expose */
    this.selectionAnchorLine = ko.pureComputed(function () {
        return selectionRange().anchorLine;
    });
    /** @expose */
    this.selectionAnchorCol = ko.pureComputed(function () {
        return selectionRange().anchorCol;
    });
    /** @expose */
    this.selectionHeadLine = ko.pureComputed(function () {
        return selectionRange().headLine;
    });
    /** @expose */
    this.selectionHeadCol = ko.pureComputed(function () {
        return selectionRange().headCol;
    });
}

/** @private */
CodeForm.prototype.checkIsLoading = function () {
    return this.doc() && typeof this.doc()() === 'undefined';
};

/** @private */
CodeForm.prototype.getReadyDoc = function () {
    if (!this.isLoading()) {
        this.readyDocVal = this.doc();
    }
    return this.readyDocVal;
};
