var ko = require('knockout');

module.exports = MyQueries;

/**
 * @constructor
 * @params {{selectItemCallback, addEvent}} params
 */
function MyQueries(params) {
    this.storage = params['storage'];
    this['selectItem'] = params['selectItemCallback'];
    this['items'] = this.items = ko.observableArray(this.load());
    this['removeItem'] = this.removeItem.bind(this);

    this.addEventSubscription = params['addEvent'].subscribe(this.newItem, this);
}

/** @private */
MyQueries.prototype.load = function () {
    var itemsCount = this.storage.length;
    var items = new Array();
    for (var i = 0; i < itemsCount; i++) {
        var key = this.storage.key(i);
        if (key.lastIndexOf(this.storageKeyPrefix, 0) === 0) {
            items.push(this.restoreItem(key));
        }
    }
    return items;
};

MyQueries.prototype.storageKeyPrefix = 'pgblackboard_query_';

/** @private */
MyQueries.prototype.newItem = function (doc) {
    var newStorageKey = this.storageKeyPrefix + new Date().getTime();
    this.storage.setItem(newStorageKey, doc());
    var item = this.createItem(doc, newStorageKey);
    this.items.push(item);
    this.selectItem(item);
    return item;
};

/** @private */
MyQueries.prototype.restoreItem = function (storageKey) {
    var queryText = this.storage.getItem(storageKey);
    var doc = ko.observable(queryText).extend({ codeEditorDoc: true });
    return this.createItem(doc, storageKey);
};

/** @private */
MyQueries.prototype.createItem = function (doc, storageKey) {
    return {
        'name': ko.pureComputed(this.getQueryName.bind(this, doc))
                    .extend({ 'rateLimit': 500 }),
        'isSelected': ko.observable(false),
        getDoc: function () { return doc; },
        storageKey: storageKey,
        docSubscription: doc.subscribe(
            this.storage.setItem.bind(this.storage, storageKey)
        )
    };
};

MyQueries.prototype.removeItem = function (removingItem) {
    removingItem.docSubscription.dispose();
    this.items.remove(removingItem);
    this.storage.removeItem(removingItem.storageKey);

    if (removingItem['isSelected']()) {
        this['selectItem'](null);
    }
};

/** @private */
MyQueries.prototype.getQueryName = function (doc) {
    var queryText = ko.unwrap(doc).trim();
    var m = /\\connect\s+\w+\s*([\s\S]+)/.exec(queryText);
    if (m) {
        queryText = m[1];
    }
    m = /^create\s+(or\s+replace\s+)?([\s\S]+)/i.exec(queryText);
    if (m) {
        queryText = m[2];
    }

    return queryText.substr(0, 100) || '(empty)';
};

MyQueries.prototype['dispose'] = function () {
    this.addEventSubscription.dispose();
};
