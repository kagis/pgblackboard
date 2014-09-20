import psycopg2

from . import fileapp, dbapp, query, tree, editing


_apps = {
    ('GET', ''): fileapp.ResourceFileApp('static/index.html'),
    ('GET', 'favicon.ico'): fileapp.ResourceFileApp('static/favicon.ico'),
    ('GET', 'script.js'): fileapp.ResourceFileApp('static/script.js'),
    ('GET', 'style.css'): fileapp.ResourceFileApp('static/style.css'),
    ('GET', 'assets/table/table.js'): fileapp.ResourceFileApp('static/table/table.js'),
    ('GET', 'assets/table/table.css'): fileapp.ResourceFileApp('static/table/table.css'),
    ('GET', 'assets/map/map.js'): fileapp.ResourceFileApp('static/map/map.js'),
    ('GET', 'assets/map/map.css'): fileapp.ResourceFileApp('static/map/map.css'),
    ('POST', ''): dbapp.DatabaseApp(psycopg2, query.QueryDatabaseAppHandler),
    ('GET', 'tree'): dbapp.DatabaseApp(psycopg2, tree.TreeDatabaseAppHandler),
    ('POST', 'edit'): dbapp.DatabaseApp(psycopg2, editing.EditDatabaseAppHandler),
}

def application(environ, start_response):
    pathinfo = environ['PATH_INFO'].strip('/')
    method = environ['REQUEST_METHOD']
    app = _apps[method, pathinfo]
    yield from app(environ, start_response)
