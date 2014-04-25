function TreeNode(obj) {
    this.nodes = ko.observable();
    this.isExpanded = ko.observable(false);
    this.childrenAreLoading = ko.observable(false);
    this.isLeaf = !obj.childrenQuery;
    this.obj = obj;
    this.name = obj.name;
    this.type = obj.type;
    this.comment = obj.comment;
}

TreeNode.prototype.expand = function () {
    this.isExpanded(true);
    this.childrenAreLoading(true);
    sqlexec({
        database: this.obj.databaseName,
        args: this.obj.childrenQueryArgs || [this.obj.oid],
        query: this.obj.childrenQuery,
        context: this,
        success: this._onChildrenLoaded
    });
};

TreeNode.prototype._onChildrenLoaded = function (tuples) {
    this.childrenAreLoading(false);
    this.nodes(tuples.map(this._createChildNode, this));
};

TreeNode.prototype._createChildNode = function (objTuple) {
    return new TreeNode(this.obj.createChildFromTuple(objTuple));
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
        database: this.obj.databaseName,
        args: [this.obj.oid],
        query: this.obj.definitionQuery,
        context: this,
        success: this._onDefinitionLoaded
    });
};

TreeNode.prototype._onDefinitionLoaded = function (tuples) {
    var header = '\\connect ' + this.obj.databaseName + '\n\n';
    model.queries.addBlank(header + tuples[0].def);
};


function Database(name, comment) {
    this.name = name;
    this.comment = comment;
    this.databaseName = name;
}

Database.prototype.type = 'database';
Database.prototype.fontelloIcon = 'database';
Database.prototype.childrenQuery = sqlQueries.databaseChildren;
Database.prototype.childrenQueryArgs = [];
Database.prototype.createChildFromTuple = function (tup) {
    return new Schema(tup.oid, tup.name, tup.comment, this.databaseName);
};


function Schema(oid, name, comment, databaseName) {
    this.oid = oid;
    this.name = name;
    this.comment = comment;
    this.databaseName = databaseName;
}

Schema.prototype.type = 'schema';
Schema.prototype.fontelloIcon = 'popup';
Schema.prototype.childrenQuery = sqlQueries.schemaChildren;
Schema.prototype.createChildFromTuple = function (tup) {
    var Child = (tup.typ === 'table' ? Table :
                 tup.typ === 'func' ? Func : null);
    return new Child(tup, this.databaseName);
};


function Table(tup, databaseName) {
    this.oid = tup.oid;
    this.name = tup.name;
    this.comment = tup.comment;
    this.type = (tup.relkind === 'r' ? 'table' :
                tup.relkind === 'v' ? 'view' :
                tup.relkind === 'f' ? 'foreigntable' :
                tup.relkind === 'm' ? 'matview' : null);
    this.databaseName = databaseName;
}

Table.prototype.type = 'table';
Table.prototype.fontelloIcon = 'table';
Table.prototype.definitionQuery = sqlQueries.tableDef;
Table.prototype.childrenQuery = sqlQueries.tableChildren;
Table.prototype.createChildFromTuple = function (tup) {
    return new Column(tup.name, tup.comment,
        this.oid, this.databaseName);
};


function Func(tup, databaseName) {
    this.oid = tup.oid;
    this.name = tup.name;
    this.comment = tup.comment;
    this.databaseName = databaseName;
}

Func.prototype.type = 'func';
Func.prototype.fontelloIcon = 'code';
Func.prototype.definitionQuery = sqlQueries.funcDef;


function Column(name, comment, tableOid, databaseName) {
    this.name = name;
    this.comment = comment;
    this.tableOid = tableOid;
    this.databaseName = databaseName;
}

Column.prototype.type = 'column';
Column.prototype.fontelloIcon = 'doc-text-1';

function Root() {

}

Root.prototype.type = 'root';
Root.prototype.databaseName = 'postgres';
Root.prototype.childrenQuery = sqlQueries.databases;
Root.prototype.childrenQueryArgs = [];
Root.prototype.createChildFromTuple = function (tup) {
    return new Database(tup.name, tup.comment);
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
