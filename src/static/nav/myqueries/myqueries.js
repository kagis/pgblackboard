ko.components.register('x-myqueries', {
    template: 'myqueries-tmpl',
    viewModel: MyQueries,
    synchronous: true
});

/**
@constructor
@params {{selectItemCallback, addEvent}} params */
function MyQueries(params) {
    this['selectItem'] = params['selectItemCallback'];
    this['items'] = this.items = ko.observableArray(this.load());

    this.addEventSubscription = params['addEvent'].subscribe(this.newItem, this);
}

MyQueries.prototype._storage = window.localStorage;

/**
@private */
MyQueries.prototype.load = function () {
    var itemsCount = this._storage.length;
    var items = new Array(itemsCount);
    for (var i = 0; i < itemsCount; i++) {
        var key = this._storage.key(i);
        if (key.lastIndexOf(this._storageKeyPrefix, 0) === 0) {
            items[i] = this.restoreItem(key);
        }
    }
    return items;
};

MyQueries.prototype._storageKeyPrefix = 'pgblackboard_query_';

/**
@private */
MyQueries.prototype.newItem = function (doc) {
    var newStorageKey = this._storageKeyPrefix + new Date().getTime();
    this._storage.setItem(newStorageKey, ko.unwrap(doc));
    var item = this.createItem(doc, newStorageKey);
    this.items.push(item);
    return item;
};

/**
@private */
MyQueries.prototype.restoreItem = function (storageKey) {
    var queryText = this._storage.getItem(storageKey);
    var doc = ko.observable(queryText).extend({ editorDoc: true });
    return this.createItem(doc, storageKey);
};

/**
@private */
MyQueries.prototype.createItem = function (doc, storageKey) {
    return {
        'name': ko.pureComputed(this.getQueryName.bind(this, doc))
                    .extend({ 'rateLimit': 500 }),
        'isSelected': ko.observable(false),
        getDoc: function () { return doc; },
        storageKey: storageKey,
        docSubscription: doc.subscribe(
            this._storage.setItem.bind(this._storage, storageKey)
        )
    };
};

MyQueries.prototype['removeItem'] = function (removingItem) {
    removingItem.docSubscription.dispose();
    this.items.remove(removingItem);
    this._storage.removeItem(removingItem.storageKey);

    if (removingItem['isSelected']()) {
        this['selectItem'](null);
    }
};

/**
@private */
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
