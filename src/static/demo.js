var ko = require('knockout'),
    TreeNode = require('./nav/tree/treeViewModel').TreeNode;

TreeNode.prototype.getDoc = function () {
    var doc = ko.observable().extend({ codeEditorDoc: true });
    setTimeout(function () {
        doc(this.name);
        doc.notifySubscribers(doc(), 'ready');
    }.bind(this), 1000);
    return doc;
};

TreeNode.prototype.loadChildren = function (options) {
    setTimeout(
        options.success.bind(
            this,
            options.parent.children || []
        ),
        500
    );
};

module.exports = {
    myQueriesStorage: window.sessionStorage,
    databases: [
        database('postgres', [
            schema('information_schema', [

            ]),
            schema('pg_catalog', [
            ]),
            schema('public'),
        ]),

        database('database', [

        ]),

        schema('schema', [
        ]),

        extension('extension', [
            table('table', [
                pkcolumn('id : int'),
                column('message : text'),
                fkcolumn('foreign_id: int'),
            ]),

            func('function'),
            agg('aggregate'),
        ]),

        table('table', [
            pkcolumn('id : int'),
            column('message : text'),
            fkcolumn('foreign_id: int'),
        ]),

        view('view'),
        matview('materialized view'),
        foreigntable('foreign table'),

        pkcolumn('primary key column'),
        fkcolumn('foreign key column'),
        column('regular column : type'),

        index('index'),
        trigger('trigger'),
        foreignkey('foreignkey'),
        check('check constraint'),
        unique('unique constraint'),

        func('function'),
        agg('aggregate'),
    ],
    initialCode: 'demo'
};

window.addEventListener('click', function (e) {
    if (e.target.classList.contains('codeform__exec-table')) {
        e.target.form.action = "output/table/table-demo.html";
    }

    if (e.target.classList.contains('codeform__exec-map')) {
        e.target.form.action = "output/map/map-demo.html";
    }
}, true);



function database(name, children) {
    return {
        name: name,
        typ: 'database',
        has_children: true,
        children: children
    };
}

function schema(name, children) {
    return {
        name: name,
        typ: 'schema',
        has_children: true,
        children: children
    };
}

function extension(name, children) {
    return {
        name: name,
        typ: 'extension',
        has_children: true,
        children: children
    };
}

function table(name, children) {
    return {
        name: name,
        typ: 'table',
        has_children: true,
        children: children
    };
}

function view(name, children) {
    return {
        name: name,
        typ: 'view',
        has_children: true,
        children: children
    };
}

function matview(name, children) {
    return {
        name: name,
        typ: 'matview',
        has_children: true,
        children: children
    };
}

function foreigntable(name, children) {
    return {
        name: name,
        typ: 'foreigntable',
        has_children: true,
        children: children
    };
}

function pkcolumn(name, children) {
    return {
        name: name,
        typ: 'pkcolumn',
        has_children: false,
        children: children
    };
}

function fkcolumn(name, children) {
    return {
        name: name,
        typ: 'fkcolumn',
        has_children: false,
        children: children
    };
}

function column(name, children) {
    return {
        name: name,
        typ: 'column',
        has_children: false,
        children: children
    };
}

function index(name, children) {
    return {
        name: name,
        typ: 'index',
        has_children: false,
        children: children
    };
}

function trigger(name, children) {
    return {
        name: name,
        typ: 'trigger',
        has_children: false,
        children: children
    };
}

function foreignkey(name, children) {
    return {
        name: name,
        typ: 'foreignkey',
        has_children: false,
        children: children
    };
}

function check(name, children) {
    return {
        name: name,
        typ: 'check',
        has_children: false,
        children: children
    };
}

function unique(name, children) {
    return {
        name: name,
        typ: 'unique',
        has_children: false,
        children: children
    };
}

function func(name, children) {
    return {
        name: name,
        typ: 'func',
        has_children: false,
        children: children
    };
}

function agg(name, children) {
    return {
        name: name,
        typ: 'agg',
        has_children: false,
        children: children
    };
}
