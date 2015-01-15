(function () {
'use strict';



var pbgg = window.pgbb = {};
pgbb.extend = ko.utils.extend;






/*
    SPLITPANEL
*/

pgbb.initSplitter = function (splitter) {
    var panel1 = splitter.previousElementSibling;
    var panel2 = splitter.nextElementSibling;
    var splitpanel = splitter.parentNode;

    var isHorizontal = splitter.className.match(/\bsplitter-h\b/);
    var resize = isHorizontal ? resizeH : resizeV;

    var splitterHeight = splitter.offsetHeight;
    var splitterWidth = splitter.offsetWidth;
    var splitpanelBounds;

    splitter.addEventListener('mousedown', onSplitterMouseDown);

    var resizeEvt = document.createEvent('HTMLEvents');
    resizeEvt.initEvent('resize', false, false);


    function fireResize() {
        panel1.dispatchEvent(resizeEvt);
        panel2.dispatchEvent(resizeEvt);
    }


    function onSplitterMouseDown(e) {
        if ('setCapture' in splitter) {
            splitter.setCapture();
        }
        splitpanelBounds = splitpanel.getBoundingClientRect();
        window.addEventListener('mousemove', onSplitterMouseMove);
        window.addEventListener('mouseup', onSplitterMouseUp);
        splitpanel.className += ' splitting ' +
            (isHorizontal ? 'splitting-h' : 'splitting-v');
        e.preventDefault(); // disable text selection
    }

    function onSplitterMouseUp(e) {
        if ('releaseCapture' in splitter) {
            splitter.releaseCapture();
        }

        splitpanel.className = splitpanel.className
            .replace(/\bsplitting\b/, '')
            .replace(/\bsplitting-h\b/, '')
            .replace(/\bsplitting-v\b/, '')
            .trim();

        window.removeEventListener('mousemove', onSplitterMouseMove);
        window.removeEventListener('mouseup', onSplitterMouseUp);
        fireResize();
    }

    function onSplitterMouseMove(e) {
        resize(e.clientX, e.clientY);
        fireResize();
    }

    function resizeH(_, y) {
        y -= splitpanelBounds.top;
        if (y <= splitterHeight) {
            panel1.style.bottom = '100%';
            panel2.style.top = splitterHeight + 'px';
            splitter.style.top = 0;
            splitter.style.bottom = null;
        } else {
            var percentage = (y / splitpanelBounds.height) * 100;
            percentage = Math.max(0, Math.min(100, percentage));
            panel1.style.bottom = 100 - percentage + '%';
            panel2.style.top = percentage + '%';
            splitter.style.top = null;
            splitter.style.bottom = 100 - percentage + '%';
        }
    }

    function resizeV(x, _) {
        x -= splitpanelBounds.left;
        if (x <= splitterWidth) {
            panel1.style.right = '100%';
            panel2.style.left = splitterWidth + 'px';
            splitter.style.left = 0;
            splitter.style.right = null;
        } else {
            var percentage = (x / splitpanelBounds.width) * 100;
            percentage = Math.max(0, Math.min(100, percentage));
            panel1.style.right = 100 - percentage + '%';
            panel2.style.left = percentage + '%';
            splitter.style.left = null;
            splitter.style.right = 100 - percentage + '%';
        }
    }
};

// var shieldEl = document.createElement('div');
// shieldEl.className = 'splitshield';
// document.body.appendChild(shieldEl);


pgbb.initSplitter(document.querySelector('.splitter-h'));
pgbb.initSplitter(document.querySelector('.splitter-v'));




/*
    TREE
*/

pgbb.TreeNode = function (tuple) {
    this.nodes = ko.observable();
    this.childrenAreLoading = ko.observable(false);

    this.isExpanded = ko.pureComputed(function () {
        return this.nodes() && !this.childrenAreLoading();
    }, this);
    this.isCollapsed = ko.pureComputed(function () {
        return !this.nodes() && !this.childrenAreLoading();
    }, this);

    this.isOpened = ko.observable(false);

    this.database = tuple.database;
    this.hasChildren = tuple.hasChildren;
    this.name = tuple.name;
    this.type = tuple.type;
    this.id = tuple.id;
    this.isGroupStart = tuple.isGroupStart;
    this.comment = tuple.comment;
};

ko.utils.extend(pgbb.TreeNode.prototype, {
    expand: function () {
        this.childrenAreLoading(true);
        this._sqlexec({
            query: 'children',
            success: this._onChildrenLoaded,
            error: this._onChildrenLoadError
        });
    },

    _onChildrenLoaded: function (tuples) {
        this.childrenAreLoading(false);
        var TreeNode = this.constructor;
        this.nodes(tuples.map(function (tuple) {
            return new TreeNode(tuple);
        }));
    },

    _onChildrenLoadError: function () {
        this.childrenAreLoading(false);
        alert('ERROR while loading child tree nodes.');
    },

    collapse: function () {
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
        var quotedDatabase = this.database;
        if (quotedDatabase.indexOf('"') !== -1) {
            quotedDatabase = '"' + quotedDatabase.replace(/"/g, '""') + '"';
        }

        this._sqlexec({
            query: 'definition',
            success: function (resp) {
                onComplete.call(context,
                    '\\connect ' + quotedDatabase +
                    '\n\n' + resp.definition
                );
            },
            error: function () {
                onComplete.call(context, '/*\n  ERROR while loading definition.\n*/');
            }
        });
    },

    _sqlexec: function (options) {
        var req = new XMLHttpRequest();
        req.onload = onLoad;
        req.onerror = onLoadEnd;
        req.open('GET', 'tree?' + [
            'database=' + encodeURIComponent(this.database),
            'q=' + encodeURIComponent(options.query),
            'nodeid=' + encodeURIComponent(this.id || ''),
            'nodetype=' + encodeURIComponent(this.type)
        ].join('&'));
        req.send();


        var callbackContext = this;

        function onLoad(e) {
            if (e.target.status === 200) {
                // because IE does not support responseType='json'
                var jsonResp = JSON.parse(e.target.responseText);
                options.success.call(callbackContext, jsonResp);
            } else {
                options.error.call(callbackContext);
            }
        }

        function onLoadEnd(e) {
            options.error.call(callbackContext);
        }
    }
});


/*
    STORED QUERIES
*/

pgbb.StoredQueriesList = function () {
    this.items = ko.observableArray();
    this._load();
    var saveDirty = this.saveDirty.bind(this);
    window.addEventListener('beforeunload', saveDirty);
    setInterval(saveDirty, 5000);
};

ko.utils.extend(pgbb.StoredQueriesList.prototype, {
    _load: function () {
        for (var i = 0; i < localStorage.length; i++) {
            var key = localStorage.key(i);
            if (/^pgblackboard_query_\d+$/.exec(key)) {
                var queryText = localStorage.getItem(key);
                var editSession = new CodeMirror.Doc(queryText, "text/x-pgsql");
                var item = new pgbb.StoredQuery(key, editSession);
                item.isDirty = false;
                this.items.push(item);
            }
        }
    },

    newQuery: function (editSession) {
        var time = new Date().getTime();
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
        }
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
    var editor = CodeMirror.fromTextArea(document.getElementById('sql_script'), {
        lineNumbers: true,
        matchBrackets: true,
        showCursorWhenSelecting: true,
        autoCloseBrackets: true,
        autofocus: true,
        mode: 'text/x-pgsql',
        keyMap: 'sublime',
        gutters: ['CodeMirror-linenumbers', 'errors-gutter']
    });


    editor.display.scrollbarV.className += ' scrollbox';
    editor.display.scrollbarH.className += ' scrollbox';

    // add gutter shadow when scrolled horizontal
    editor.on('scroll', function () {
        ko.utils.toggleDomNodeCssClass(
            editor.display.gutters,
            'CodeMirror-gutters--overlaying',
            editor.getScrollInfo().left > 1
        );
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


    // todo: codemirror refresh is expensive, do something
    queryform.parentNode.addEventListener('resize', editor.refresh.bind(editor));
    queryform.parentNode.parentNode.addEventListener('resize', editor.refresh.bind(editor));
    window.addEventListener('resize', editor.refresh.bind(editor));

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

pgbb.AppModel = function (editor, initialData) {
    this.isLightsOn = ko.observable(true);
    this.theme = ko.pureComputed(function () {
        return this.isLightsOn() ? 'light' : 'dark';
    }, this);

    this._onBlankEditSessionChangedBinded =
        this._onBlankEditSessionChanged.bind(this);

    this._editor = editor;
    this.queries = new pgbb.StoredQueriesList();
    this.tree = {
        nodes: initialData.databases.map(function (options) {
            return new pgbb.TreeNode(options);
        })
    };

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
    },

    openBlank: function () {
        var doc = new CodeMirror.Doc('', 'text/x-pgsql');
        this._editor.swapDoc(doc);
        this._trackBlankEditSession(doc);
        this._openedItem(null);
    },

    _trackBlankEditSession: function (editSession) {
        editSession.on('change', this._onBlankEditSessionChangedBinded);
    },

    _onBlankEditSessionChanged: function (doc) {
        doc.off('change', this._onBlankEditSessionChangedBinded);

        var newStoredQuery = this.queries.newQuery(doc);
        this.openStoredQuery(newStoredQuery);
    },

    toggleTheme: function () {
        this.isLightsOn(!this.isLightsOn());
    }
});


pgbb.editor = pgbb.initEditor();

pgbb.main = function (initialData) {
    pgbb.model = new pgbb.AppModel(pgbb.editor, initialData);

    ko.bindingProvider.instance = new ko.flatBindingProvider();
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


})();
