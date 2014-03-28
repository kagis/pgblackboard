function TreeNode(obj) {
    this.nodes = null;
    this.isExpanded = false;
    this.childrenAreLoading = false;
    ko.track(this);
    this.canExpand = obj.canHaveChildren;
    this.obj = obj;
    this.nameTmpl = obj.objType + '-tree-node-name-tmpl';
}

TreeNode.prototype.expand = function () {
    this.childrenAreLoading = true;
    var that = this;
    this.obj.loadChildren(function (children) {
        that.isExpanded = true;
        that.childrenAreLoading = false;
        that.nodes = children.map(function (childObj) {
            return new TreeNode(childObj);
        });
    });
};

TreeNode.prototype.collapse = function () {
    this.isExpanded = false;
};

TreeNode.prototype.toggle = function () {
    if (this.isExpanded) {
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
            select schema_name as name \
            from information_schema.schemata \
            order by name",
        success: function (result) {
            complete(result.map(function (it) {
                return new Schema(it.name, databaseName);
            }));
        }

    });
};


function Schema(name, databaseName) {
    this.name = name;
    this.databaseName = databaseName;
}

Schema.prototype.objType = 'schema';
Schema.prototype.canHaveChildren = true;

Schema.prototype.loadChildren = function (complete) {
    var databaseName = this.databaseName,
        schemaName = this.name;

    sqlexec({
        database: databaseName,
        args: [schemaName],
        query: " \
            (select 'table' as typ, table_name as name \
            from information_schema.tables \
            where table_schema = $1 \
            order by name) \
            union all \
            (select 'func' as typ, routine_name as name \
            from information_schema.routines \
            where routine_schema = $1 \
            order by name)",
        success: function (result) {
            complete(result.map(function (it) {
                switch(it.typ) {
                case 'table': return new Table(it.name, databaseName, schemaName);
                case 'func': return new Func(it.name, databaseName, schemaName);
                }
            }));
        }
    });
};


function Table(name, databaseName, schemaName) {
    this.name = name;
    this.schemaName = schemaName;
    this.databaseName = databaseName;
}

Table.prototype.objType = 'table';
Table.prototype.canHaveChildren = true;

Table.prototype.loadChildren = function (complete) {
     var databaseName = this.databaseName,
         schemaName = this.schemaName,
         tableName = this.name;

    sqlexec({
        database: databaseName,
        args: [schemaName,  tableName],
        query: "\
            select column_name as name, data_type \
            from information_schema.columns \
            where table_schema = $1 and table_name = $2",
        success: function (result) {
            complete(result.map(function (it) {
                return new Column(it.name, it.data_type,
                    databaseName, schemaName, tableName);
            }));
        }
    });

};


function Func(name, databaseName, schemaName) {
    this.name = name;
    this.schemaName = schemaName;
    this.databaseName = databaseName;
}

Func.prototype.objType = 'func';
Func.prototype.canHaveChildren = false;

Func.prototype.open = function (complete) {
    var databaseName = this.databaseName;
    sqlexec({
        database: this.databaseName,
        args: [this.schemaName + '.' + this.name],
        query: "select pg_get_functiondef(($1::text)::regproc) as def",
        success: function (result) {
            complete('\\connect ' + databaseName + '\n\n' + result[0].def);
        }
    });
};


function Column(name, dataType, databaseName, schemaName, tableName) {
    this.name = name;
    this.dataType = dataType;
    this.tableName = tableName;
    this.schemaName = schemaName;
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
    var req = new XMLHttpRequest;
    req.overrideMimeType('application/json');
    req.open('POST', '/', true);
    req.onload = function () {
        var jsonResponse = JSON.parse(req.responseText);
        options.success.call(options.context || this, jsonResponse);
    };
    req.send('format=json' +
        '&database=' + options.database +
        '&query=' + encodeURIComponent(options.query) +
        (options.args || []).map(function (a) {
            return '&arg=' + encodeURIComponent(a);
        }).join('')
    );
}
