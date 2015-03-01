/**
@constructor */
function MyQueryRepo(storage) {
    this._storage = storage;
    this.items = ko.observableArray();
    this._load();
    var saveDirty = this.saveDirty.bind(this);
    window.addEventListener('beforeunload', saveDirty);
    setInterval(saveDirty, 5000);

    var repo = this;
    MyQuery.prototype.remove = function () {
        repo.remove(this);
    };
}

MyQueryRepo.prototype._load = function () {
    for (var i = 0; i < this._storage.length; i++) {
        var key = this._storage.key(i);

        // if key starts with _storageKeyPrefix
        if (key.lastIndexOf(this._storageKeyPrefix, 0) === 0) {
            var queryText = this._storage.getItem(key);
            var doc = ko.observable(queryText).extend({ editorDoc: true });
            var item = new MyQuery(key, doc);
            item.isDirty = false;
            this.items.push(item);
        }
    }
};

MyQueryRepo.prototype._storageKeyPrefix = 'pgblackboard_query_';

MyQueryRepo.prototype.newQuery = function (doc) {
    var newStorageKey = this._storageKeyPrefix + new Date().getTime();
    var query = new MyQuery(newStorageKey, doc);
    this.items.push(query);
    return query;
};

MyQueryRepo.prototype.saveDirty = function () {
    var items = this.items();
    for (var i = items.length - 1; i >= 0; i--) {
        var item = items[i];
        if (item.isDirty) {
            this._storage.setItem(item.storageKey, ko.unwrap(item.doc));
            item.isDirty = false;
        }
    }
};

MyQueryRepo.prototype.remove = function (item) {
    this.items.remove(item);
    this._storage.removeItem(item.storageKey);
};



/**
@constructor */
function MyQuery(storageKey, doc) {
    this.doc = doc;
    this.isOpened = ko.observable(false);

    this.isDirty = true;
    this.storageKey = storageKey;

    this.name = ko.pureComputed(this._getName, this)
                  .extend({ rateLimit: 500 });

    this.doc.subscribe(this._markAsDirty, this);
}

MyQuery.prototype._markAsDirty = function () {
    this.isDirty = true;
};

MyQuery.prototype._getName = function () {
    var queryText = ko.unwrap(this.doc).trim();
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

MyQuery.prototype.remove = function () {

};
