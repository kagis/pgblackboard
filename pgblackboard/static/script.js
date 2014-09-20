window.pgbb = {};
pgbb.extend = ko.utils.extend;



/*
    SPLITPANEL
*/

pgbb.SplitPanel = function (el, orientation) {
    this._resizeFixedPanel = orientation === 'horizontal' ?
        this._resizeFixedPanelHorizontal : this._resizeFixedPanelVertical;

    this._el = el;
    this._fixedPanelEl = el.querySelector('.splitfix');

    this._panel1 = el.children[0];
    this._panel2 = el.children[2];

    el.querySelector('.splitter').addEventListener('mousedown', this._onSplitterMouseDown.bind(this));
};

pgbb.extend(pgbb.SplitPanel.prototype, {
    _resizeEvent: new Event('resize'),

    _fireResize: function () {
        this._panel1.dispatchEvent(this._resizeEvent);
        this._panel2.dispatchEvent(this._resizeEvent);
    },

    _onSplitterMouseDown: function (e) {
        this._startX = this._fixedPanelEl.offsetWidth - e.clientX;
        this._startY = this._fixedPanelEl.offsetHeight + e.clientY;
        this._onSplitterMouseUpBinded = this._onSplitterMouseUp.bind(this);
        this._onSplitterMouseMoveBinded = this._onSplitterMouseMove.bind(this);

        document.body.classList.add('splitting');
        document.addEventListener('mousemove', this._onSplitterMouseMoveBinded);
        document.addEventListener('mouseup', this._onSplitterMouseUpBinded);
    },

    _onSplitterMouseUp: function (e) {
        document.removeEventListener('mouseup', this._onSplitterMouseUpBinded);
        document.removeEventListener('mousemove', this._onSplitterMouseMoveBinded);
        document.body.classList.remove('splitting');
        this._fireResize();
    },

    _onSplitterMouseMove: function (e) {
        this._resizeFixedPanel(e.clientX, e.clientY);
        this._fireResize();
    },

    _resizeFixedPanelVertical: function (_, y) {
        this._fixedPanelEl.style.height = (this._startY - y) + 'px';
    },

    _resizeFixedPanelHorizontal: function (x, _) {
       this._fixedPanelEl.style.width = (this._startX + x) + 'px';
    }
});

var shieldEl = document.createElement('div');
shieldEl.className = 'splitshield';
document.body.appendChild(shieldEl);


new pgbb.SplitPanel(document.querySelector('.splitpanel-h'), 'horizontal');
new pgbb.SplitPanel(document.querySelector('.splitpanel-v'), 'vertical');





/*
    TREE
*/

pgbb.TreeNode = function (tuple) {
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
    this._childrenQuery = tuple.childquery;
    this._definitionQuery = tuple.defquery;

    if (tuple.expanded) {
        this.expand();
    }
};

ko.utils.extend(pgbb.TreeNode.prototype, {
    expand: function () {
        this.isExpanded(true);
        this.childrenAreLoading(true);
        this._sqlexec({
            query: this._childrenQuery,
            success: this._onChildrenLoaded
        });
    },

    _onChildrenLoaded: function (tuples) {
        this.childrenAreLoading(false);
        var ctor = this.constructor;
        this.nodes(tuples.map(function (tuple) {
            return new ctor(tuple);
        }));
    },

    collapse: function () {
        this.isExpanded(false);
        this.nodes(null);
    },

    toggle: function () {
        if (this.isExpanded()) {
            this.collapse();
        } else {
            this.expand();
        }
    },

    getDefinition: function (onComplete, context) {
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
            this._sqlexec({
                query: this._definitionQuery,
                success: function (tuples) {
                    onComplete.call(context,
                        '\\connect ' + this.database +
                        '\n\n' + tuples[0].def
                    );
                }
            });
        }
    },

    _sqlexec: function (options) {
        var req = new XMLHttpRequest();
        var context = this;
        req.onload = function (e) {
            var response = e.target.response;
            if (response.error) {
                console.error(response.error);
            } else {
                options.success.call(context, response);
            }
        };
        req.open('GET', 'tree?database=' + this.database +
                             '&q=' + options.query +
                             (this.id ? '&oid=' + this.id : ''));
        req.responseType = 'json';
        req.send();
    }
});


/*
    STORED QUERIES
*/

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
                var editSession = new CodeMirror.Doc(queryText, "text/x-mysql");
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





/*
    EDITOR
*/


// load query from hash
if (location.hash) {
    document.getElementById('query').value =
        decodeURIComponent(location.hash.slice(1));
}

// show share link on alt+x
document.getElementById('share-action').addEventListener('click', function () {
    prompt('Share this url', location.origin + location.pathname +
        '#' + encodeURIComponent(pgbb.editor.getValue()));
});


pgbb.initEditor = function () {
    var editor = CodeMirror.fromTextArea(document.getElementById('query'), {
        lineNumbers: true,
        matchBrackets: true,
        showCursorWhenSelecting: true,
        autoCloseBrackets: true,
        autofocus: true,
        mode: 'text/x-mysql',
        keyMap: 'sublime',
        theme: 'monokai',
        gutters: ['CodeMirror-linenumbers', 'errors-gutter']
    });

    function onSubmit() {
        editor.clearGutter('errors-gutter');
        var selStart = editor.getCursor(true),
            selEnd   = editor.getCursor(false);
        queryform.elements.selection.value = editor.somethingSelected() ?
            JSON.stringify([[selStart.line, selStart.ch],
                            [  selEnd.line,   selEnd.ch]]) : null;
    }

    var queryform = document.getElementById('queryform');
    queryform.onsubmit = onSubmit;
    function fitEditorSize() {
        editor.setSize(queryform.clientWidth, queryform.clientHeight);
    }
    queryform.addEventListener('resize', fitEditorSize);
    queryform.parentNode.addEventListener('resize', fitEditorSize);
    window.addEventListener('resize', fitEditorSize);

    fitEditorSize();

    return editor;
};


pgbb.setError = function (line, message) {
    var marker = document.createElement('div');
    marker.className = 'gutter-marker-error';
    marker.dataset.title = message;
    pgbb.editor.setGutterMarker(line, 'errors-gutter', marker);
};






/*
    APPMODEL
*/

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
