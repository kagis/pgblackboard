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
    this._childrenQuery = tuple.childquery && document.getElementById(tuple.childquery).textContent;
    this._definitionQuery = tuple.defquery && document.getElementById(tuple.defquery).textContent;

    if (tuple.expanded) {
        this.expand();
    }
};

ko.utils.extend(pgbb.TreeNode.prototype, {
    expand: function () {
        this.isExpanded(true);
        this.childrenAreLoading(true);
        sqlexec({
            database: this.database,
            args: this.id && [this.id],
            query: this._childrenQuery,
            context: this,
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
    }
});



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
