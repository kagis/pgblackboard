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

function TreeNode(data, loadChildren) {
    this.nodes = null;
    this.isExpanded = false;
    this.childrenAreLoading = false;
    this.hasChildren = !!loadChildren;
    this.nameTmpl = 'def-tree-node-name-tmpl';
    this._loadChildren = loadChildren;
    for (x in data) {
        this[x] = data[x];
    }
    ko.track(this);
}

TreeNode.prototype.expand = function () {
    this.childrenAreLoading = true;
    var that = this;
    this._loadChildren(this, function (children) {
        that.isExpanded = true;
        that.childrenAreLoading = false;
        that.nodes = children;
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

function extend(Child, Parent) {
    var F = function() { };
    F.prototype = Parent.prototype;
    Child.prototype = new F();
    Child.prototype.constructor = Child;
    Child.superclass = Parent.prototype;
}

function loadSchemaNodes(databaseNode, complete) {
    sqlexec({
        database: databaseNode.name,
        query: "\
            select schema_name as name \
            from information_schema.schemata \
            order by name",
        success: function (result) {
            complete(result.map(function (j) {
                j.icon = 'popup';
                j.dbName = databaseNode.name;
                return new TreeNode(j, loadTableNodes);
            }));
        }

    });
}

function loadTableNodes(schemaNode, complete) {
    sqlexec({
        database: schemaNode.dbName,
        args: [schemaNode.name],
        query: " \
            (select 'table' as typ, table_name as name \
            from information_schema.tables \
            where table_schema = $1 \
            order by name) \
            union all \
            (select 'func' as typ, routine_name as name \
            from information_schema.routines \
            where routine_schema = $1)",
        success: function (result) {
            complete(result.map(function (j) {
                j.dbName = schemaNode.dbName;
                j.schemaName = schemaNode.name;
                switch(j.typ) {
                case 'table':
                    j.icon = 'table';
                    return new TreeNode(j, loadColumnNodes);
                case 'func':
                    j.icon = 'code';
                    return new TreeNode(j, null);
                }

            }));
        }
    });
}

// \connect geoportalkz
// select routine_name
// from information_schema.routines
// where routine_schema = 'adm'

function loadColumnNodes(tableNode, complete) {
    sqlexec({
        database: tableNode.dbName,
        args: [
            tableNode.schemaName,
            tableNode.name
        ],
        query: "\
            select column_name as name, data_type \
            from information_schema.columns \
            where table_schema = $1 and table_name = $2",
        success: function (result) {
            complete(result.map(function (j) {
                j.icon = 'doc-text-1';
                j.dbName = tableNode.dbName;
                j.dataType = j.data_type;
                j.nameTmpl = 'column-tree-node-name-tmpl';
                return new TreeNode(j, null);
            }));
        }
    });
}

function MyQueries() {
    this.items = [];
    ko.track(this);

    var itemsOwner = this;

    function MyQueriesItem(id, content) {
        this.content = content;
        this.name = content.substr(0, 15);
        this.isCurrent = false;
        this.isDirty = false;
        ko.track(this);

        this.id = id;
        this._owner = itemsOwner;
    }

    MyQueriesItem.prototype.open = function () {
        this._owner.items.forEach(function (i) {
            if (i.isCurrent) {
                i.save();
                i.isCurrent = false;
            }
        });
        this.isCurrent = true;
        sqleditor.setValue(this.content, -1);
    };

    MyQueriesItem.prototype.save = function () {
        this.content = sqleditor.getValue();
        localStorage.setItem(this.id, this.content);
    };

    MyQueriesItem.prototype.remove = function () {
        this._owner.items.destroy(this);
    };

    this._Item = MyQueriesItem;
}

MyQueries.prototype.add = function () {
    var time = new Date().getTime()
    var query = new this._Item('pgblackboard_query_' + time, "\\connect postgres\nselect 'awesome';");
    this.items.push(query);
    query.open();
    return query;
};

MyQueries.prototype.load = function () {
    for (var i = localStorage.length - 1; i >= 0; i--) {
        var key = localStorage.key(i);
        var query_key_match = /^pgblackboard_query_\d+/.exec(key);
        if (query_key_match) {
            var content = localStorage.getItem(key);
            this.items.push(new this._Item(key, content));
        }
    }
}

var model = ko.track({
    nodes: [],
    myQueries: new MyQueries(),
});

ko.applyBindings(model);

model.myQueries.load();

sqlexec({
    database: 'postgres',
    query: "select datname as name FROM pg_database",
    success: function (result) {
        model.nodes = result.map(function (j) {
            j.icon = 'database';
            return new TreeNode(j, loadSchemaNodes);
        });
    }
});


var sqleditor = ace.edit('code');
sqleditor.setOptions({
    enableBasicAutocompletion: true
});
sqleditor.setTheme("ace/theme/monokai");
sqleditor.getSession().setMode("ace/mode/pgsql");
sqleditor.setFontSize(20);

sqleditor.commands.addCommand({
    name: 'execute',
    bindKey: {win: 'Ctrl-Shift-E',  mac: 'Ctrl-Shift-E'},
    exec: function() {
        submitQuery()
    }
});

var codeForm = document.getElementById('code-form');

codeForm.onsubmit = function () {
    syncQueryInput();
    return true;
};

function syncQueryInput() {
    document.getElementById('query-input').value =
        sqleditor.getSelectedText() || sqleditor.getValue();
}

function submitQuery() {
    syncQueryInput();
    codeForm.submit();
}


// /^\s*select\s+((?:\s*\w+\s*,?)+)\s+from\s+((?:\w+\.)?\w+)/



//https://www.mapbox.com/v3/base.mapbox-streets+bg-4c4c4c_scale-1_water-0.47x0.47;0.00x0.00;0.05x0.05;0.00x1.00_streets-0.50x0.50;0.00x0.20;0.90x0.00;0.00x1.00_landuse-0.48x0.48;0.00x0.00;0.00x0.40;0.00x1.00_buildings-0.49x0.49;0.00x0.00;0.05x0.45;0.00x1.00/16/46766/24019.png?update=hsydm
