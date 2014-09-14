pgbb.AppModel = function (editor) {
    this._onBlankEditSessionChangedBinded =
        this._onBlankEditSessionChanged.bind(this);

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
    this._trackBlankEditSession(editor.getDoc());
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
        var doc = openingStoredQuery.getEditSession();
        this._editor.swapDoc(doc);
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

        var doc = new CodeMirror.Doc('', 'text/x-mysql');
        this._editor.swapDoc(doc);

        var loadingContext = {
            isLoading: ko.observable(true)
        };
        this._loadingContext(loadingContext);

        treeNode.getDefinition(function (def) {
            doc.setValue(def);
            this._trackBlankEditSession(doc);
            loadingContext.isLoading(false);
        }, this);
    },

    openBlank: function () {
        var doc = new CodeMirror.Doc('' /*, 'ace/mode/pgsql'*/);
        this._editor.swapDoc(doc);
        this._trackBlankEditSession(doc);
        this._openedItem(null);
    },

    _trackBlankEditSession: function (editSession) {
        editSession.on('change', this._onBlankEditSessionChangedBinded);
    },

    _onBlankEditSessionChanged: function (doc) {
        doc.off('change', this._onBlankEditSessionChangedBinded)

        var newStoredQuery = this.queries.newQuery(doc);
        this.openStoredQuery(newStoredQuery);
    }
});


pgbb.editor = pgbb.initEditor();

pgbb.model = new pgbb.AppModel(pgbb.editor);
ko.applyBindings(pgbb.model);
