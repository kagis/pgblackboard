function TreeNode(obj) {
    this.nodes = ko.observable();
    this.isExpanded = ko.observable(false);
    this.childrenAreLoading = ko.observable(false);
    this.isLeaf = !obj.canHaveChildren;
    this.obj = obj;
    this.comment = obj.comment;
    this.nameTmpl = obj.objType + '-tree-node-name-tmpl';
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


function Database(name) {
    this.name = name;
    this.databaseName = name;
}

Database.prototype.objType = 'database';
Database.prototype.canHaveChildren = true;
Database.prototype.childrenQuery = sqlQueries.databaseChildren;
Database.prototype.childrenQueryArgs = [];
Database.prototype.createChildFromTuple = function (tup) {
    return new Schema(tup.oid, tup.name, this.databaseName);
};


function Schema(oid, name, databaseName) {
    this.oid = oid;
    this.name = name;
    this.databaseName = databaseName;
}

Schema.prototype.objType = 'schema';
Schema.prototype.canHaveChildren = true;
Schema.prototype.childrenQuery = sqlQueries.schemaChildren;
Schema.prototype.createChildFromTuple = function (tup) {
    switch(tup.typ) {
    case 'table': return new Table(tup.oid, tup.name, this.databaseName);
    case 'func': return new Func(tup.oid, tup.name, this.databaseName);
    }
};


function Table(oid, name, databaseName) {
    this.oid = oid;
    this.name = name;
    this.databaseName = databaseName;
}

Table.prototype.objType = 'table';
Table.prototype.canHaveChildren = true;
Table.prototype.definitionQuery = sqlQueries.tableDef;
Table.prototype.childrenQuery = sqlQueries.tableChildren;
Table.prototype.createChildFromTuple = function (tup) {
    return new Column(tup.name, tup.comment, tup.datatype,
        this.oid, this.databaseName);
};


function Func(oid, name, databaseName) {
    this.oid = oid;
    this.name = name;
    this.databaseName = databaseName;
}

Func.prototype.objType = 'func';
Func.prototype.canHaveChildren = false;
Func.prototype.definitionQuery = sqlQueries.funcDef;


function Column(name, comment, dataType, tableOid, databaseName) {
    this.name = name;
    this.comment = comment;
    this.dataType = dataType;
    this.tableOid = tableOid;
    this.databaseName = databaseName;
}

Column.prototype.objType = 'column';
Column.prototype.canHaveChildren = false;


function Root() {

}

Root.prototype.objType = 'root';
Root.prototype.canHaveChildren = true;
Root.prototype.databaseName = 'postgres';
Root.prototype.childrenQuery = sqlQueries.databases;
Root.prototype.childrenQueryArgs = [];
Root.prototype.createChildFromTuple = function (tup) {
    return new Database(tup.name);
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
    };/*
    var form = new FormData();
    form.appen('format', 'json');
    form.append('database', options.database);
    form.append('query', options.query);
    form.append();*/
    req.open('POST', '');
    req.responseType = 'json';
    req.send('format=json' +
        '&database=' + options.database +
        '&query=' + encodeURIComponent(options.query) +
        (options.args ? '&args=' + JSON.stringify(options.args) : '')
    );
}
