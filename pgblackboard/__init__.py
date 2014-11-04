import psycopg2

from . import index, fileapp, dbapp, query, tree, editing


_routes = {
    ('GET', ''): dbapp.DatabaseApp(psycopg2, index.IndexDatabaseAppHandler),
    ('GET', 'tree'): dbapp.DatabaseApp(psycopg2, tree.TreeDatabaseAppHandler),
    ('POST', 'edit'): dbapp.DatabaseApp(psycopg2, editing.EditDatabaseAppHandler),
    ('POST', ''): dbapp.DatabaseApp(psycopg2, query.QueryDatabaseAppHandler),
    ('GET', 'favicon.ico'): fileapp.ResourceFileApp('static/favicon.ico'),
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

    ,'static/lib/codemirror/4.6.0/codemirror.js'
    ,'static/lib/codemirror/4.6.0/codemirror.min.js'
    ,'static/lib/codemirror/4.6.0/mode/sql/sql.js'
    ,'static/lib/codemirror/4.6.0/mode/sql/sql.min.js'
    ,'static/lib/codemirror/4.6.0/addon/search/searchcursor.js'
    ,'static/lib/codemirror/4.6.0/addon/search/searchcursor.min.js'
    ,'static/lib/codemirror/4.6.0/keymap/sublime.js'
    ,'static/lib/codemirror/4.6.0/keymap/sublime.min.js'
    ,'static/lib/codemirror/4.6.0/addon/edit/matchbrackets.js'
    ,'static/lib/codemirror/4.6.0/addon/edit/matchbrackets.min.js'
    ,'static/lib/codemirror/4.6.0/addon/edit/closebrackets.js'
    ,'static/lib/codemirror/4.6.0/addon/edit/closebrackets.min.js'
    ,'static/lib/codemirror/4.6.0/codemirror.css'
    ,'static/lib/codemirror/4.6.0/codemirror.min.css'
    ,'static/lib/knockout/3.2.0/knockout.js'
    ,'static/lib/knockout/3.2.0/knockout.min.js'
    ,'static/lib/knockout-att/1.0.0/knockout-att.js'
    ,'static/lib/knockout-att/1.0.0/knockout-att.min.js'
    ,'static/lib/d3/3.4.11/d3.js'
    ,'static/lib/d3/3.4.11/d3.min.js'
    ,'static/lib/dagre-d3/0.2.9/dagre-d3.js'
    ,'static/lib/dagre-d3/0.2.9/dagre-d3.min.js'
    ,'static/lib/leaflet/0.7.3/leaflet.js'
    ,'static/lib/leaflet/0.7.3/leaflet.min.js'
    ,'static/lib/leaflet/0.7.3/leaflet.css'
    ,'static/lib/leaflet/0.7.3/leaflet.min.css'
]})


def application(environ, start_response):
    pathinfo = environ['PATH_INFO'].strip('/')
    method = environ['REQUEST_METHOD']
    app = _routes[method, pathinfo]
    yield from app(environ, start_response)
