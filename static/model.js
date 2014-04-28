function AppModel(editor) {
    this._editor = editor;
    this.queries = new StoredQueriesList();
    this.tree = new TreeNode({
        childquery: 'databases',
        database: 'postgres',
        expanded: true
    });

    this._openedItem = ko.observable();
    this._openedItem.subscribe(this._onItemClosing, this, 'beforeChange');
    this._openedItem.subscribe(this._onItemOpening, this);

    this._loadingContext = ko.observable();
}

AppModel.prototype._onItemClosing = function (closingItem) {
    if (closingItem) {
        closingItem.isOpened(false);
    }
};

AppModel.prototype._onItemOpening = function (openingItem) {
    if (openingItem) {
        openingItem.isOpened(true);
    }
};

AppModel.prototype.openStoredQuery = function (openingStoredQuery) {
    var editSession = openingStoredQuery.getEditSession();
    this._editor.setSession(editSession);
    this._openedItem(openingStoredQuery);
};

AppModel.prototype.removeStoredQuery = function (removingStoredQuery) {
    this.queries.remove(removingStoredQuery);
    if (this._openedItem() === removingStoredQuery) {
        this.openBlank();
    }
};

AppModel.prototype.queryTextIsLoading = function () {
    return this._loadingContext() &&
        this._loadingContext().isLoading();
};

AppModel.prototype.openTreeNode = function (treeNode) {
    this._openedItem(treeNode);

    var editSession = ace.createEditSession('', 'ace/mode/pgsql');
    this._editor.setSession(editSession);

    var loadingContext = {
        isLoading: ko.observable(true)
    };
    this._loadingContext(loadingContext);

    treeNode.getDefinition(function (def) {
        editSession.setValue(def);
        this._trackBlankEditSession(editSession);
        loadingContext.isLoading(false);
    }, this);
};

AppModel.prototype.openBlank = function () {
    var editSession = ace.createEditSession('', 'ace/mode/pgsql');
    this._editor.setSession(editSession);
    this._trackBlankEditSession(editSession);
    this._openedItem(null);
};

AppModel.prototype._trackBlankEditSession = function (editSession) {
    editSession.once('change', this._onBlankEditSessionChanged.bind(this));
};

AppModel.prototype._onBlankEditSessionChanged = function (_, editSession) {
    var newStoredQuery = this.queries.newQuery(editSession);
    this.openStoredQuery(newStoredQuery);
};




function TreeNode(tuple) {
    this.nodes = ko.observable();
    this.isExpanded = ko.observable(false);
    this.childrenAreLoading = ko.observable(false);
    this.isOpened = ko.observable(false);

    this.database = tuple.database;
    this.isLeaf = !tuple.childquery;
    this.name = tuple.name;
    this.type = tuple.type;
    this.comment = tuple.comment;
    this.id = tuple.oid;
    this._childrenQuery = treesql[tuple.childquery];
    this._definitionQuery = treesql[tuple.defquery];

    if (tuple.expanded) {
        this.expand();
    }
}

TreeNode.prototype.expand = function () {
    this.isExpanded(true);
    this.childrenAreLoading(true);
    sqlexec({
        database: this.database,
        args: this.id && [this.id],
        query: this._childrenQuery,
        context: this,
        success: this._onChildrenLoaded
    });
};

TreeNode.prototype._onChildrenLoaded = function (tuples) {
    this.childrenAreLoading(false);
    this.nodes(tuples.map(function (tuple) {
        return new TreeNode(tuple);
    }));
};

TreeNode.prototype.collapse = function () {
    this.isExpanded(false);
    this.nodes(null);
};

TreeNode.prototype.toggle = function () {
    if (this.isExpanded()) {
        this.collapse();
    } else {
        this.expand();
    }
};

TreeNode.prototype.getDefinition = function (onComplete, context) {
    if (!this._definitionQuery) {
        if (this.type === 'database') {
            onComplete.call(context,
                "\\connect " + this.database +
                "\nselect 'awesome';"
            );
        } else {
            onComplete.call(context, '-- not implemented');
        }
    } else {
        sqlexec({
            database: this.database,
            args: [this.id],
            query: this._definitionQuery,
            context: this,
            success: function (tuples) {
                onComplete.call(context,
                    '\\connect ' + this.database +
                    '\n\n' + tuples[0].def
                );
            }
        });
    }
};




function sqlexec(options) {
    var req = new XMLHttpRequest();
    req.onload = function (e) {
        var response = e.target.response;
        if (response.error) {
            console.error(response.error);
        } else {
            options.success.apply(options.context, response.results);
        }
    };
    var form = new FormData();
    form.append('format', 'json');
    form.append('database', options.database);
    form.append('query', options.query);
    if (options.args) {
        form.append('args', JSON.stringify(options.args));
    }
    req.open('POST', '');
    req.responseType = 'json';
    req.send(form);
}




function StoredQueriesList() {
    this.items = ko.observableArray();
    this._load();
    var saveDirty = this.saveDirty.bind(this)
    window.addEventListener('beforeunload', saveDirty);
    setInterval(saveDirty, 5000);
}

StoredQueriesList.prototype._load = function () {
    for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (/^pgblackboard_query_\d+/.exec(key)) {
            var queryText = localStorage.getItem(key);
            var editSession = ace.createEditSession(queryText, 'ace/mode/pgsql');
            var item = new StoredQuery(key, editSession);
            item.isDirty = false;
            this.items.push(item);
        }
    }
};

StoredQueriesList.prototype.newQuery = function (editSession) {
    var time = new Date().getTime()
    var query = new StoredQuery('pgblackboard_query_' + time, editSession);
    this.items.push(query);
    return query;
};

StoredQueriesList.prototype.remove = function (item) {
    this.items.remove(item);
    localStorage.removeItem(item.localStorageKey);
};

StoredQueriesList.prototype.saveDirty = function () {
    var items = this.items();
    for (var i = items.length - 1; i >= 0; i--) {
        var item = items[i];
        if (item.isDirty) {
            localStorage.setItem(item.localStorageKey, item.queryText());
            item.isDirty = false;
        }
    };
};


function StoredQuery(localStorageKey, editSession) {
    this.queryText = ko.observable(editSession.getValue());
    this.editSessionIsReady = ko.observable(true);
    this.isOpened = ko.observable(false);

    this.isDirty = true;

    this._editSession = editSession;
    this._editSession.on('change', this._onChange.bind(this));
    this.localStorageKey = localStorageKey;

    this.name = ko.computed(this._name, this)
        .extend({ rateLimit: 500 });
}

StoredQuery.prototype._name = function () {
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
};

StoredQuery.prototype.getEditSession = function () {
    return this._editSession;
};

StoredQuery.prototype._onChange = function () {
    this.queryText(this._editSession.getValue());
    this.isDirty = true;
};
