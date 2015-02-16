function AppModel(editor, initialData) {
    TreeNode.prototype.open = this.openTreeNode.bind(this);
    MyQuery.prototype.open = this.openStoredQuery.bind(this);

    this.isLightsOn = ko.observable(true);
    this.theme = ko.pureComputed(function () {
        return this.isLightsOn() ? 'light' : 'dark';
    }, this);

    this._onBlankEditSessionChangedBinded =
        this._onBlankEditSessionChanged.bind(this);

    this._editor = editor;
    this.queries = new MyQueryRepo();
    this.tree = {
        nodes: initialData['databases'].map(function (options) {
            return new TreeNode(options);
        })
    };

    this._openedItem = ko.observable();
    this._openedItem.subscribe(this._onItemClosing, this, 'beforeChange');
    this._openedItem.subscribe(this._onItemOpening, this);

    this._loadingContext = ko.observable();
    this._trackBlankEditSession(editor.getDoc());
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
    var doc = openingStoredQuery.getEditSession();
    this._editor.swapDoc(doc);
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

    var doc = new CodeMirror.Doc('', 'text/x-pgsql');
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
};

AppModel.prototype.openBlank = function () {
    var doc = new CodeMirror.Doc('', 'text/x-pgsql');
    this._editor.swapDoc(doc);
    this._trackBlankEditSession(doc);
    this._openedItem(null);
};

AppModel.prototype._trackBlankEditSession = function (editSession) {
    editSession.on('change', this._onBlankEditSessionChangedBinded);
};

AppModel.prototype._onBlankEditSessionChanged = function (doc) {
    doc.off('change', this._onBlankEditSessionChangedBinded);

    var newStoredQuery = this.queries.newQuery(doc);
    this.openStoredQuery(newStoredQuery);
};

AppModel.prototype.toggleTheme = function () {
    this.isLightsOn(!this.isLightsOn());
};




pgbb.editor = pgbb.initEditor();

window['main'] = function (initialData) {

    var myQueryRepo = new MyQueryRepo(window['localStorage']);

    pgbb.model = new pgbb.AppModel(pgbb.editor, initialData);
    ko.applyBindings(pgbb.model);
};



pgbb.initResult = function (resultWindow) {
    resultWindow.pgbb = pgbb;
    ko.computed(function () {
        ko.utils.toggleDomNodeCssClass(
            resultWindow.document.body,
            'light',
            pgbb.model.isLightsOn()
        );

        ko.utils.toggleDomNodeCssClass(
            resultWindow.document.body,
            'dark',
            !pgbb.model.isLightsOn()
        );
    });
};
