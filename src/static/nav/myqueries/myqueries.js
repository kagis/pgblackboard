/**
@constructor */
function MyQueries(storage) {
    this._storage = storage;
    this['items'] = this.items = ko.observableArray();
}

MyQueries.prototype.load = function () {
    for (var i = 0; i < this._storage.length; i++) {
        var key = this._storage.key(i);

        // if key starts with _storageKeyPrefix
        if (key.lastIndexOf(this._storageKeyPrefix, 0) === 0) {
            this.items.push(this.restoreQuery(key));
        }
    }
};

MyQueries.prototype._storageKeyPrefix = 'pgblackboard_query_';

MyQueries.prototype.newItem = function (doc) {
    var newStorageKey = this._storageKeyPrefix + new Date().getTime();
    this._storage.setItem(newStorageKey, ko.unwrap(doc));
    var item = this.createItem(newStorageKey, doc);
    this.items.push(item);
    return item;
};

MyQueries.prototype.restoreItem = function (storageKey) {
    var queryText = this._storage.getItem(key);
    var doc = ko.observable(queryText).extend({ editorDoc: true });
    return this.createItem(doc, storageKey);
};

MyQueries.prototype.createItem = function (doc, storageKey) {
    return {
        'name': ko.pureComputed(this.getQueryName.bind(this, doc))
                    .extend({ rateLimit: 500 }),
        'isOpened': ko.observable(false),
        doc: doc,
        storageKey: storageKey,
        docSubscription: doc.subscribe(
            this._storage.setItem.bind(this._storage, storageKey)
        )
    };
};

MyQueries.prototype.removeItem = function (item) {
    item.docSubscription.dispose();
    this.items.remove(item);
    this._storage.removeItem(item.storageKey);
};

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
