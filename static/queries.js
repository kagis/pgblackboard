function Queries() {
    this._currentItem = ko.observable();
    this.items = ko.observableArray();

    var itemsOwner = this;


    function QueriesItem(localStorageKey, content) {
        this.content = ko.observable(content);

        this._isDirty = false;
        this._isBlank = true;
        this._editSession = ace.createEditSession(content, 'ace/mode/pgsql');
        this._editSession.on('change', this._handleChange.bind(this));
        this._localStorageKey = localStorageKey;
        this._owner = itemsOwner;

        this.isCurrent = ko.computed(function () {
            return this._owner._currentItem() === this;
        }, this);


        this.name = ko.computed(function () {
            return this.content().substr(0, 15) || '(empty)';
        }, this).extend({ rateLimit: 500 });
    }

    QueriesItem.prototype.open = function () {
        if (this._owner._currentItem()) {
            this._owner._currentItem().ensureSave();
        }
        this._owner._currentItem(this);
        sqleditor.setSession(this._editSession);
    };

    QueriesItem.prototype.ensureSave = function () {
        if (!this._isBlank && this._isDirty) {
            localStorage.setItem(this._localStorageKey, this.content());
            this._isDirty = false;
        }
    };

    QueriesItem.prototype.remove = function () {
        this._owner.items.destroy(this);
        this._isDirty = false;
        localStorage.removeItem(this._localStorageKey);
        this._owner.addBlank('');
    };

    QueriesItem.prototype._handleChange = function () {
        if (this._isBlank) {
            this._isBlank = false;
            this._owner.items.push(this);
        }
        this.content(this._editSession.getValue());
        this._isDirty = true;
    };

    this._Item = QueriesItem;

    this.addBlank('');

    window.addEventListener('beforeunload', this._handlePageUnload.bind(this));
}



Queries.prototype.add = function () {
    this.addBlank("\\connect postgres\nselect 'awesome';");
};

Queries.prototype.addBlank = function (content) {
    var blank = this._createBlank(content);
    blank.open();
};

Queries.prototype._createBlank = function (content) {
    var time = new Date().getTime()
    var blank = new this._Item('pgblackboard_query_' + time, content);
    return blank;
};

Queries.prototype.load = function () {
    for (var i = localStorage.length - 1; i >= 0; i--) {
        var key = localStorage.key(i);
        var query_key_match = /^pgblackboard_query_\d+/.exec(key);
        if (query_key_match) {
            var content = localStorage.getItem(key);
            var item = new this._Item(key, content);
            item._isBlank = false;
            this.items.push(item);
        }
    }
};

Queries.prototype._handlePageUnload = function () {
    if (this._currentItem()) {
        this._currentItem().ensureSave();
    }
};
