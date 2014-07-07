import psycopg2

from . import fileapp, dbapp, query, tree


_apps = {
    ('GET', ''): fileapp.ResourceFileApp('index.html'),
    ('POST', ''): dbapp.DatabaseApp(psycopg2, query.QueryDatabaseAppHandler),
    ('GET', 'tree'): dbapp.DatabaseApp(psycopg2, tree.TreeDatabaseAppHandler)
}

_apps.update({('GET', fn): fileapp.ResourceFileApp(fn) for fn in [
    'favicon.ico',

    'assets/appmodel.js',
    'assets/editor.js',
    'assets/queries.js',
    'assets/tree.js',
    'assets/style.css',

    'assets/splitpanel/splitpanel.js',
    'assets/splitpanel/splitpanel.css',

    'assets/table/table.js',
    'assets/table/table.css',

    'assets/map/map.js',
    'assets/map/map.css',

    'assets/fontello/fontello-embedded.css',
]})

def application(environ, start_response):
    pathinfo = environ['PATH_INFO'].strip('/')
    method = environ['REQUEST_METHOD']
    app = _apps[method, pathinfo]
    yield from app(environ, start_response)
