function TreeNode(tuple) {
    this.nodes = ko.observable();
    this.isExpanded = ko.observable(false);
    this.childrenAreLoading = ko.observable(false);

    this.database = tuple.database;
    this.isLeaf = !tuple.childquery;
    this.name = tuple.name;
    this.type = tuple.type;
    this.comment = tuple.comment;
    this.id = tuple.oid;
    this._childrenQuery = treesql[tuple.childquery];
    this._definitionQuery = treesql[tuple.defquery];
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

TreeNode.prototype.open = function () {
    sqlexec({
        database: this.database,
        args: [this.id],
        query: this._definitionQuery,
        context: this,
        success: this._onDefinitionLoaded
    });
};

TreeNode.prototype._onDefinitionLoaded = function (tuples) {
    var header = '\\connect ' + this.database + '\n\n';
    model.queries.addBlank(header + tuples[0].def);
};

function treeRoot() {
    return new TreeNode({
        childquery: 'databases',
        database: 'postgres'
    });
}

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
