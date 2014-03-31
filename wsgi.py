from itertools import chain
from base64 import b64decode
from urllib.parse import parse_qs
from json import dumps as json_dumps, loads as json_loads
from re import match

from postgresql.driver import connect
from postgresql.exceptions import ClientCannotConnectError
from sqlparse import split as split_sql_str


index_html = open('index.html', 'r').read()


def wsgi_v2(app):
    def wsgi1(environ, start_response):
        status, headers, app_iter = app(environ)
        start_response(status, headers)
        yield from app_iter
    return wsgi1


def str_response(app):
    def wrapper(environ):
        status, headers, app_iter = app(environ)
        headers_dict = dict(headers)
        headers_dict['Content-type'] += '; charset=utf-8'
        headers = list(headers_dict.items())
        return status, headers, (
            x.encode() for x in app_iter
        )
    return wrapper


@wsgi_v2
@str_response
def application(environ):
    path_info = environ['PATH_INFO']
    if path_info != '/':
        return ('404 Not Found',
            [('Content-type', 'text/plain')],
            [path_info + ' not found']
        )

    if environ['REQUEST_METHOD'] == 'GET':
        return ('200 OK',
            [('Content-type', 'text/html')],
            [index_html]
        )

    try:
        auth = environ['HTTP_AUTHORIZATION']
    except KeyError:
        return ('401 Unauthorized',
            [('Content-type', 'text/plain'),
             ('WWW-Authenticate', 'Basic realm="main"')],
            ['User name and password required.']
        )
    try:
        auth_scheme, b64cred = auth.split(' ', 1)
        user, password = b64decode(b64cred).decode().split(':', 1)
    except:
        return ('400 Bad Request',
            [('Content-type', 'text/plain')],
            ['Unexpected credentials format.']
        )

    params = parse_qs(environ['wsgi.input'].read().decode())
    try:
        query = params['query'][0]
        format = params.get('format', ('html',))[0]
        args = params.get('arg', ())
        database = params.get('database', (None,))[0]
    except LookupError:
        return ('400 Bad Request',
            [('Content-type', 'text/plain')],
            ['Bad requiest']
        )

    connect_pattern = r'(?ixs)^ \s* \\connect \s+ (\w+) \s* (.*)'
    conn_m = match(connect_pattern, query)
    if conn_m:
        database, query = conn_m.groups()
    if not database:
        return ('400 Bad Request',
            [('Content-type', 'text/plain')],
            ['Database was not specified.']
        )

    try:
        conn = connect(
            user=user,
            password=password,
            host=environ['postgresql.host'],
            port=int(environ['postgresql.port']),
            database=database,
        )
    except ClientCannotConnectError as ex:
        print(ex)
        return ('401 Unauthorized',
            [('Content-type', 'text/plain'),
             ('WWW-Authenticate', 'Basic realm="main"')],
            ['Invalid user name or password.']
        )

    renderer = RENDERERS.get(format, RegularRenderer)
    return ('200 OK',
        [('Content-type', renderer.mime_type),
         ('uWSGI-Encoding', 'gzip')],
        process_sql(conn, query, args, renderer)
    )


def process_sql(conn, query, args, renderer):
    statements = (
        conn.prepare(qry)
        for qry in split_sql_str(query)
        if qry
    )
    yield renderer.render_intro()
    try:
        with conn.xact():
            for stmt in statements:
                if stmt.column_names:
                    query_renderer = renderer.get_query_renderer(
                        stmt.column_names,
                        stmt.pg_column_types
                    )
                    yield query_renderer.render_intro()
                    try:
                        for rows in stmt.chunks(*args):
                            yield query_renderer.render_rows(rows)
                    finally:
                        yield query_renderer.render_outro()
                else:
                    yield renderer.render_nonquery(stmt.first(*args))
    except Exception as ex:
        yield renderer.render_exception(ex)
    yield renderer.render_outro()
    conn.close()


def strjoin(fun):
    def wrapper(*args, **kw):
        return ''.join(fun(*args, **kw))
    return wrapper


class RegularRenderer:
    mime_type = 'text/html'

    def render_intro(self):
        return (
            '<html>'
            '<head>'
            '<link href="/table.css" rel="stylesheet" type="text/css" />'
            '</head>'
            '<body>')

    def render_outro(self):
        return (
            '</body>'
            '</html>')

    def render_exception(self, exception):
        return '<pre class="error">{0}</pre>'.format(exception)

    def render_nonquery(self, result):
        return '<p class="non-query-result">{0}</p>'.format(result)

    def get_query_renderer(self, *args, **kw):
        return TableRenderer(*args, **kw)


class TableRenderer:
    def __init__(self, colnames, coltypes):
        self.colnames = colnames
        self.coltypes = coltypes
        self.colclasses = [
            'int' if typ == 23 else 'str'
            for typ in coltypes
        ]

    @strjoin
    def render_intro(self):
        yield '<table>'
        yield '<tr>'
        for name in self.colnames:
            yield '<th>'
            yield name
            yield '</th>'
        yield '</tr>'

    def render_outro(self):
        return '</table>'

    @strjoin
    def render_rows(self, rows):
        for row in rows:
            yield '<tr>'
            for val, class_ in zip(row, self.colclasses):
                yield '<td class="' + class_ + '">'
                yield '<em>null</em>' if val is None else str(val)[:100]
                yield '</td>'
            yield '</tr>'


class MapRenderer:
    mime_type = 'text/html'

    def __init__(self):
        self._querynum = 0

    def render_intro(self):
        return (
            '<html>'
            '<head>'
            '<link href="//cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.2/leaflet.css" rel="stylesheet" type="text/css" />'
            '<script>L_PREFER_CANVAS = true;</script>'
            '<script src="//cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.2/leaflet.js"></script>'
            '<link href="/map.css" rel="stylesheet" type="text/css" />'
            '</head>'
            '<body>'
            '<div id="map"></div>'
            '<script src="/map.js"></script>')

    def render_outro(self):
        return (
            '</body>'
            '</html>')

    def render_exception(self, exception):
        return '<script>console.error({0!r})</script>'.format(
            str(exception)
        )

    def render_nonquery(self, result):
        return '<script>console.log({0!r})</script>'.format(
            str(result)
        )

    def get_query_renderer(self, *args, **kw):
        self._querynum += 1
        return GeoJsonRenderer(*args, num=self._querynum, **kw)


class GeoJsonRenderer:
    def __init__(self, colnames, coltypes, num):
        self.colnames = colnames
        self.coltypes = coltypes
        self.num = num
        self.geomcol_ix = geomcol_ix = colnames.index('geom')
        self.propnames = colnames[:geomcol_ix] + colnames[geomcol_ix+1:]

    def render_intro(self):
        return ''

    def render_outro(self):
        return ''

    @strjoin
    def render_rows(self, rows):
        yield '<script>addFeatureCollection('
        yield str(self.num)
        yield ','
        yield json_dumps({
            'type': 'FeatureCollection',
            'features': [{
                'type': 'Feature',
                'geometry': json_loads(row[self.geomcol_ix] or 'null'),
                'properties': dict(zip(
                    self.propnames,
                    (x for i, x in enumerate(row)
                        if i != self.geomcol_ix)
                ))
            } for row in rows]
        }, ensure_ascii=False)
        yield ')</script>'


class JsonRenderer:
    mime_type = 'application/json'

    def render_intro(self):
        return ''

    def render_outro(self):
        return ''

    def render_exception(self, exception):
        raise exception

    def render_nonquery(self, result):
        return ''

    def get_query_renderer(self, *args, **kw):
        return JsonQueryRenderer(*args, **kw)

class JsonQueryRenderer:
    def __init__(self, colnames, coltypes):
        self.colnames = colnames
        self.coltypes = coltypes
        self.first = True

    def render_intro(self):
        return '['

    def render_outro(self):
        return ']'

    @strjoin
    def render_rows(self, rows):
        for row in rows:
            if self.first:
                self.first = False
            else:
                yield ','
            yield json_dumps(
                dict(zip(self.colnames, row)),
                ensure_ascii=False
            )


RENDERERS = {
    'map': MapRenderer(),
    'html': RegularRenderer(),
    'json': JsonRenderer(),
}
