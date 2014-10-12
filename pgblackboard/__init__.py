import functools

import psycopg2

from . import index, fileapp, dbapp, query, table, geo, tree, editing


_routes = {
    ('GET', ''): dbapp.DatabaseApp(psycopg2, index.IndexDatabaseAppHandler),
    ('GET', 'tree'): dbapp.DatabaseApp(psycopg2, tree.TreeDatabaseAppHandler),
    ('POST', 'edit'): dbapp.DatabaseApp(psycopg2, editing.EditDatabaseAppHandler),

    ('POST', ''): dbapp.DatabaseApp(psycopg2, functools.partial(
                        query.QueryDatabaseAppHandler,
                        table.TableView())),

    ('POST', 'map'): dbapp.DatabaseApp(psycopg2, functools.partial(
                        query.QueryDatabaseAppHandler,
                        geo.MapView())),
}

_routes.update({('GET', fn): fileapp.ResourceFileApp(fn) for fn in [
     'static/favicon.ico'
    ,'static/app.js'
    ,'static/app.css'
    ,'static/table.js'
    ,'static/table.css'
    ,'static/map.js'
    ,'static/map.css'
    ,'static/queryplan.js'
    ,'static/queryplan.css'

    ,'static/codemirror-pgsql.js'

    ,'static/lib-src/codemirror/4.6.0/codemirror.js'
    ,'static/lib-src/codemirror/4.6.0/mode/sql/sql.js'
    ,'static/lib-src/codemirror/4.6.0/addon/search/searchcursor.js'
    ,'static/lib-src/codemirror/4.6.0/keymap/sublime.js'
    ,'static/lib-src/codemirror/4.6.0/addon/edit/matchbrackets.js'
    ,'static/lib-src/codemirror/4.6.0/addon/edit/closebrackets.js'
    ,'static/lib-src/codemirror/4.6.0/codemirror.css'
    ,'static/lib-src/knockout/3.2.0/knockout.js'
    ,'static/lib-src/knockout-flatBindingProvider/1.0.0/knockout-flatBindingProvider.js'
    ,'static/lib-src/d3/3.4.11/d3.js'
    ,'static/lib-src/dagre-d3/0.2.9/dagre-d3.js'
    ,'static/lib-src/leaflet/0.7.3/leaflet.js'
    ,'static/lib-src/leaflet/0.7.3/leaflet.css'
]})


def application(environ, start_response):
    pathinfo = environ['PATH_INFO'].strip('/')
    method = environ['REQUEST_METHOD']
    app = _routes[method, pathinfo]
    yield from app(environ, start_response)
