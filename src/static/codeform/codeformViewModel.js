var ko = require('knockout');

module.exports = CodeForm;

/**
 * @constructor
 * @param {{doc}} params
 */
function CodeForm(params) {
    this.doc = params['doc'];
    this.isLoading = ko.pureComputed(this.checkIsLoading, this);
    this.readyDoc = ko.pureComputed(this.getReadyDoc, this);
}

/** @private */
CodeForm.prototype.checkIsLoading = function () {
    return this.doc() && typeof this.doc()() === 'undefined';
};

/** @private */
CodeForm.prototype.getReadyDoc = function () {
    if (!this.checkIsLoading()) {
        this.readyDocVal = this.doc();
    }
    return this.readyDocVal;
};
