import functools

import psycopg2

from . import index, fileapp, dbapp, query, table, geo, tree, editing


_apps = {
    ('GET', ''): dbapp.DatabaseApp(psycopg2, index.IndexDatabaseAppHandler),
    ('GET', 'favicon.ico'): fileapp.ResourceFileApp('static/favicon.ico'),
    ('GET', 'script.js'): fileapp.ResourceFileApp('static/script.js'),
    ('GET', 'style.css'): fileapp.ResourceFileApp('static/style.css'),
    ('GET', 'assets/table/table.js'): fileapp.ResourceFileApp('static/table/table.js'),
    ('GET', 'assets/table/table.css'): fileapp.ResourceFileApp('static/table/table.css'),
    ('GET', 'assets/map/map.js'): fileapp.ResourceFileApp('static/map/map.js'),
    ('GET', 'assets/map/map.css'): fileapp.ResourceFileApp('static/map/map.css'),
    ('GET', 'tree'): dbapp.DatabaseApp(psycopg2, tree.TreeDatabaseAppHandler),

    ('POST', 'edit'): dbapp.DatabaseApp(psycopg2, editing.EditDatabaseAppHandler),
    ('POST', ''): dbapp.DatabaseApp(psycopg2, functools.partial(
                        query.QueryDatabaseAppHandler,
                        table.TableView())),
    ('POST', 'map'): dbapp.DatabaseApp(psycopg2, functools.partial(
                    query.QueryDatabaseAppHandler,
                    geo.MapView())),
}

def application(environ, start_response):
    pathinfo = environ['PATH_INFO'].strip('/')
    method = environ['REQUEST_METHOD']
    app = _apps[method, pathinfo]
    yield from app(environ, start_response)
