pgbb.StoredQueriesList = function () {
    this.items = ko.observableArray();
    this._load();
    var saveDirty = this.saveDirty.bind(this)
    window.addEventListener('beforeunload', saveDirty);
    setInterval(saveDirty, 5000);
};

ko.utils.extend(pgbb.StoredQueriesList.prototype, {
    _load: function () {
        for (var i = 0; i < localStorage.length; i++) {
            var key = localStorage.key(i);
            if (/^pgblackboard_query_\d+$/.exec(key)) {
                var queryText = localStorage.getItem(key);
                var editSession = ace.createEditSession(queryText, 'ace/mode/pgsql');
                var item = new pgbb.StoredQuery(key, editSession);
                item.isDirty = false;
                this.items.push(item);
            }
        }
    },

    newQuery: function (editSession) {
        var time = new Date().getTime()
        var query = new pgbb.StoredQuery('pgblackboard_query_' + time, editSession);
        this.items.push(query);
        return query;
    },

    remove: function (item) {
        this.items.remove(item);
        localStorage.removeItem(item.localStorageKey);
    },

    saveDirty: function () {
        var items = this.items();
        for (var i = items.length - 1; i >= 0; i--) {
            var item = items[i];
            if (item.isDirty) {
                localStorage.setItem(item.localStorageKey, item.queryText());
                item.isDirty = false;
            }
        };
    }
});


pgbb.StoredQuery = function (localStorageKey, editSession) {
    this.queryText = ko.observable(editSession.getValue());
    this.editSessionIsReady = ko.observable(true);
    this.isOpened = ko.observable(false);

    this.isDirty = true;

    this._editSession = editSession;
    this._editSession.on('change', this._onChange.bind(this));
    this.localStorageKey = localStorageKey;

    this.name = ko.computed(this._name, this)
        .extend({ rateLimit: 500 });
};

ko.utils.extend(pgbb.StoredQuery.prototype, {
    _name: function () {
        var queryText = this.queryText().trim();
        var m = /\\connect\s+\w+\s*([\s\S]+)/.exec(queryText);
        if (m) {
            queryText = m[1];
        }
        m = /^create\s+(or\s+replace\s+)?([\s\S]+)/i.exec(queryText);
        if (m) {
            queryText = m[2];
        }

        return queryText.substr(0, 100) || '(empty)';
    },

    getEditSession: function () {
        return this._editSession;
    },

    _onChange: function () {
        this.queryText(this._editSession.getValue());
        this.isDirty = true;
    }
});
