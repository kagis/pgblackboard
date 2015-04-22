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
