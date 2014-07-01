pgbb.AppModel = function (editor) {
    this._editor = editor;
    this.queries = new pgbb.StoredQueriesList();
    this.tree = new pgbb.TreeNode({
        childquery: 'databases',
        database: 'postgres',
        expanded: true
    });

    this._openedItem = ko.observable();
    this._openedItem.subscribe(this._onItemClosing, this, 'beforeChange');
    this._openedItem.subscribe(this._onItemOpening, this);

    this._loadingContext = ko.observable();
    this._trackBlankEditSession(editor.getSession());
};

ko.utils.extend(pgbb.AppModel.prototype, {
    _onItemClosing: function (closingItem) {
        if (closingItem) {
            closingItem.isOpened(false);
        }
    },

    _onItemOpening: function (openingItem) {
        if (openingItem) {
            openingItem.isOpened(true);
        }
    },

    openStoredQuery: function (openingStoredQuery) {
        var editSession = openingStoredQuery.getEditSession();
        this._editor.setSession(editSession);
        this._openedItem(openingStoredQuery);
    },

    removeStoredQuery: function (removingStoredQuery) {
        this.queries.remove(removingStoredQuery);
        if (this._openedItem() === removingStoredQuery) {
            this.openBlank();
        }
    },

    queryTextIsLoading: function () {
        return this._loadingContext() &&
            this._loadingContext().isLoading();
    },

    openTreeNode: function (treeNode) {
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
    },

    openBlank: function () {
        var editSession = ace.createEditSession('', 'ace/mode/pgsql');
        this._editor.setSession(editSession);
        this._trackBlankEditSession(editSession);
        this._openedItem(null);
    },

    _trackBlankEditSession: function (editSession) {
        editSession.once('change', this._onBlankEditSessionChanged.bind(this));
    },

    _onBlankEditSessionChanged: function (_, editSession) {
        var newStoredQuery = this.queries.newQuery(editSession);
        this.openStoredQuery(newStoredQuery);
    }
});


pgbb.editor = pgbb.initEditor();
pgbb.editor.focus();

pgbb.model = new pgbb.AppModel(pgbb.editor);
ko.applyBindings(pgbb.model);
