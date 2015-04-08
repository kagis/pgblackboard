var ko = require('knockout');

module.exports = Nav;

/**
 * @constructor
 * @param {{selectedDoc}} params
 */
function Nav(params) {
    /** @expose */
    this.myQueriesStorage = params['myQueriesStorage'];
    /** @expose */
    this.databases = params['databases'];
    /** @expose */
    this.selectTreeNode = this.selectTreeNode.bind(this);

    /** @expose */
    this.selectMyQuery = this.selectMyQuery.bind(this);

    this.selectedDoc = params['selectedDoc'];

    this.selectedItem = ko.observable();

    this.selectedItem.subscribe(
        this.onSelectingItem,
        this);

    this.selectedItem.subscribe(
        this.onUnselectingItem,
        this,
        'beforeChange');

    /** @expose */
    this.addMyQueryEvent = new ko.subscribable();

    this.createMyQueryWhenDocChange(this.selectedDoc());
}

Nav.prototype.selectTreeNode = function (selectingTreeNode) {
    this.selectedItem(selectingTreeNode);
    var doc = selectingTreeNode.getDoc();
    this.selectedDoc(doc);

    doc.subscribe(
        this.createMyQueryWhenDocChange.bind(this, doc),
        this,
        'ready');
};

Nav.prototype.selectMyQuery = function (selectingMyQuery) {
    this.selectedItem(selectingMyQuery);
    if (selectingMyQuery) {
        this.selectedDoc(selectingMyQuery.getDoc());
    } else {
        this.navigateToGreetingDoc();
    }
};

/** @private */
Nav.prototype.createGreetingDoc = function () {
    return ko.observable('hello').extend({ codeEditorDoc: true });
};

/** @private */
Nav.prototype.navigateToGreetingDoc = function () {
    var greetingDoc = this.createGreetingDoc();
    this.createMyQueryWhenDocChange(greetingDoc);
    this.selectedDoc(greetingDoc);
};

/** @private */
Nav.prototype.onUnselectingItem = function (unselectingItem) {
    if (unselectingItem) {
        unselectingItem.isSelected(false);
    }
};

/** @private */
Nav.prototype.onSelectingItem = function (selectingItem) {
    if (selectingItem) {
        selectingItem.isSelected(true);
    }
};

/** @private */
Nav.prototype.createMyQueryWhenDocChange = function (doc) {
    this.docSubscription = doc.subscribe(function () {
        this.docSubscription.dispose();
        this.addMyQueryEvent.notifySubscribers(doc);
    }, this);
};
