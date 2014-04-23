function TreeNode(obj) {
    this.nodes = ko.observableArray();
    this.isExpanded = ko.observable(false);
    this.isCollapsed = ko.computed(function () {
        return !this.isExpanded();
    }, this);
    this.childrenAreLoading = ko.observable(false);
    this.isLeaf = !obj.canHaveChildren;
    this.obj = obj;
    this.nameTmpl = obj.objType + '-tree-node-name-tmpl';
}

TreeNode.prototype.expand = function () {
    this.childrenAreLoading(true);
    var that = this;
    this.obj.loadChildren(function (children) {
        that.isExpanded(true);
        that.childrenAreLoading(false);
        that.nodes(children.map(function (childObj) {
            return new TreeNode(childObj);
        }));
    });
};

TreeNode.prototype.collapse = function () {
    this.isExpanded(false);
};

TreeNode.prototype.toggle = function () {
    if (this.isExpanded()) {
        this.collapse();
    } else {
        this.expand();
    }
};

TreeNode.prototype.open = function () {
    this.obj.open(function (code) {
        model.queries.addBlank(code);
    });
};


function Database(name) {
    this.name = name;
}

Database.prototype.objType = 'database';
Database.prototype.canHaveChildren = true;

Database.prototype.loadChildren = function (complete) {
    var databaseName = this.name;
    sqlexec({
        database: databaseName,
        query: "\
            select nspname as name, oid \
            from pg_namespace \
            order by name",
        success: function (result) {
            complete(result.map(function (it) {
                return new Schema(it.oid, it.name, databaseName);
            }));
        }

    });
};


function Schema(oid, name, databaseName) {
    this.oid = oid;
    this.name = name;
    this.databaseName = databaseName;
}

Schema.prototype.objType = 'schema';
Schema.prototype.canHaveChildren = true;

Schema.prototype.loadChildren = function (complete) {
    var databaseName = this.databaseName;
    sqlexec({
        database: databaseName,
        args: [this.oid],
        query: " \
            (select 'table' as typ, oid, relname as name \
            from pg_class \
            where relnamespace = $1 and relkind in ('r', 'v', 'm', 'f') \
            order by name) \
            union all \
            (select 'func' as typ, oid, format('%s(%s)',  proname, array_to_string(proargtypes::regtype[], ', ')) as name \
            from pg_proc \
            where pronamespace = $1 \
            order by name)",
        success: function (result) {
            complete(result.map(function (it) {
                switch(it.typ) {
                case 'table': return new Table(it.oid, it.name, databaseName);
                case 'func': return new Func(it.oid, it.name, databaseName);
                }
            }));
        }
    });
};


function Table(oid, name, databaseName) {
    this.oid = oid;
    this.name = name;
    this.databaseName = databaseName;
}

Table.prototype.objType = 'table';
Table.prototype.canHaveChildren = true;

Table.prototype.loadChildren = function (complete) {
    var databaseName = this.databaseName,
        tableOid = this.oid;
    sqlexec({
        database: databaseName,
        args: [tableOid],
        query: "\
            select attname as name, format_type(atttypid, null) as datatype \
            from pg_attribute \
            where attrelid = $1 and attnum > 0 \
            order by attnum",
        success: function (result) {
            complete(result.map(function (it) {
                return new Column(it.name, it.datatype, tableOid, databaseName);
            }));
        }
    });

};


function Func(oid, name, databaseName) {
    this.oid = oid;
    this.name = name;
    this.databaseName = databaseName;
}

Func.prototype.objType = 'func';
Func.prototype.canHaveChildren = false;

Func.prototype.open = function (complete) {
    var databaseName = this.databaseName;
    sqlexec({
        database: this.databaseName,
        args: [this.oid],
        query: "select pg_get_functiondef($1) as def",
        success: function (result) {
            complete('\\connect ' + databaseName + '\n\n' + result[0].def);
        }
    });
};


function Column(name, dataType, tableOid, databaseName) {
    this.name = name;
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

Root.prototype.loadChildren = function (complete) {
    sqlexec({
        database: 'postgres',
        query: "select datname as name from pg_database",
        success: function (result) {
            complete(result.map(function (it) {
                return new Database(it.name);
            }));
        }
    });
};


function sqlexec(options) {
    var req = new XMLHttpRequest();
    req.onload = function (e) {
        var respArr = e.target.response;
        respArr = respArr.slice(1); // skip "json" elem
        var lastItem = respArr.slice(-1)[0]
        if (lastItem && lastItem.type === 'error') {
            console.error(lastItem.body);
        } else {
            options.success.apply(options.context || this,
                respArr.map(function(it) {
                    return it.body;
                })
            );
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
