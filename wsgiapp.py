import base64, json, cgi, io

from postgresql.driver import connect
from postgresql.exceptions import ClientCannotConnectError
from sqlsplit import sqlsplit
from shapely import wkb


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
    try:
        auth = environ['HTTP_AUTHORIZATION']
    except KeyError:
        return ('401 Unauthorized',
            [('Content-type', 'text/plain'),
             ('WWW-Authenticate', 'Basic realm="postgresql"')],
            ['User name and password required.']
        )
    try:
        auth_scheme, b64cred = auth.split(' ', 1)
        user, password = base64.b64decode(b64cred).decode().split(':', 1)
    except:
        return ('400 Bad Request',
            [('Content-type', 'text/plain')],
            ['Unexpected credentials format.']
        )

    params = cgi.FieldStorage(
        fp=io.TextIOWrapper(
            io.BytesIO(environ['wsgi.input'].read()),
            encoding='utf-8',
            newline='\n'
        ),
        environ=environ,
        keep_blank_values=True
    )

    query = params.getfirst('query')
    database = params.getfirst('database')
    format = params.getfirst('format', 'html')
    args = json.loads(params.getfirst('args', '[]'))
    if not (query and database):
        return ('400 Bad Request',
            [('Content-type', 'text/plain')],
            ['Invalid params.']
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
        # have no idea how detect auth error only
        print(ex)
        return ('401 Unauthorized',
            [('Content-type', 'text/plain'),
             ('WWW-Authenticate', 'Basic realm="postgresql"')],
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
        for qry in sqlsplit(query)
        if qry
    )
    yield renderer.render_intro()
    try:
        yield renderer.render_before_results()
        try:
            for stmt_index, stmt in enumerate(statements):
                if stmt.column_names:
                    query_renderer = renderer.get_query_renderer(
                        stmt.column_names,
                        stmt.sql_column_types,
                        stmt_index
                    )
                    yield query_renderer.render_intro()
                    try:
                        for rows in stmt.chunks(*args):
                            yield query_renderer.render_rows(rows)
                    finally:
                        yield query_renderer.render_outro()
                else:
                    yield renderer.render_nonquery(stmt.first(*args), stmt_index)
        finally:
            yield renderer.render_after_results()
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
            '<link href="table.css" rel="stylesheet" type="text/css" />'
            '</head>'
            '<body>')

    def render_outro(self):
        return (
            '</body>'
            '</html>')

    def render_before_results(self):
        return ''

    def render_after_results(self):
        return ''

    def render_exception(self, exception):
        return '<pre class="error">{0}</pre>'.format(exception)

    def render_nonquery(self, result, stmt_index):
        return '<p class="non-query-result">{0}</p>'.format(result)

    def get_query_renderer(self, *args, **kw):
        return TableRenderer(*args, **kw)


def render_html_json(s):
    return json.dumps(json.loads(s), ensure_ascii=False, indent=4)


class TableRenderer:
    def __init__(self, colnames, coltypes, stmt_index):
        self.colnames = colnames
        self.coltypes = coltypes
        self.colisnum = [
            typ in ('INTEGER', 'BIGINT', 'NUMERIC')
            for typ in coltypes
        ]
        self.colrenderers = [
            render_html_json if typ == '"pg_catalog"."json"' else str
            for typ in coltypes
        ]

    @strjoin
    def render_intro(self):
        yield '<table onclick="event.target.classList.toggle(\'expanded\')">'
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
            for val, isnum, render in zip(row, self.colisnum, self.colrenderers):
                yield '<td'
                if isnum:
                    yield ' class="num"'
                yield '>'
                yield '<em>null</em>' if val is None else render(val)
                yield '</td>'
            yield '</tr>'


class MapRenderer:
    mime_type = 'text/html'

    def render_intro(self):
        return (
            '<html>'
            '<head>'
            '<link href="//cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.2/leaflet.css" rel="stylesheet" type="text/css" />'
            '<script>L_PREFER_CANVAS = true;</script>'
            '<script src="//cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.2/leaflet.js"></script>'
            '<link href="map.css" rel="stylesheet" type="text/css" />'
            '</head>'
            '<body>'
            '<div id="map"></div>'
            '<script src="map.js"></script>')

    def render_outro(self):
        return (
            '</body>'
            '</html>')

    def render_before_results(self):
        return ''

    def render_after_results(self):
        return ''

    def render_exception(self, exception):
        return '<script>console.error({0!r})</script>'.format(
            str(exception)
        )

    def render_nonquery(self, result, stmt_index):
        return '<script>console.log({0!r})</script>'.format(
            str(result)
        )

    def get_query_renderer(self, *args, **kw):
        return GeoJsonRenderer(*args, **kw)


def hex_ewkb_mapping(hex_ewkb):
    if hex_ewkb:
        return wkb.loads(hex_ewkb, hex=True).__geo_interface__
    else:
        return None

class GeoJsonRenderer:
    def __init__(self, colnames, coltypes, stmt_index):
        self.colnames = colnames
        self.coltypes = coltypes
        self.stmt_index = stmt_index
        self.geomcol_ix = geomcol_ix = colnames.index('geom')
        self.propnames = colnames[:geomcol_ix] + colnames[geomcol_ix+1:]

    def render_intro(self):
        return ''

    def render_outro(self):
        return ''

    @strjoin
    def render_rows(self, rows):
        yield '<script>addFeatureCollection('
        yield str(self.stmt_index)
        yield ','
        yield json.dumps({
            'type': 'FeatureCollection',
            'features': [{
                'type': 'Feature',
                'geometry': hex_ewkb_mapping(row[self.geomcol_ix]),
                'properties': dict(zip(
                    self.propnames,
                    (x for i, x in enumerate(row)
                        if i != self.geomcol_ix)
                ))
            } for row in rows]
        }, ensure_ascii=False, default=str)
        yield ')</script>'


class JsonRenderer:
    mime_type = 'application/json'

    def render_intro(self):
        return '{'

    def render_outro(self):
        return '}'

    def render_before_results(self):
        return '"results":['

    def render_after_results(self):
        return ']'

    def render_exception(self, exception):
        return ',"error":' + json.dumps(str(exception))

    @strjoin
    def render_nonquery(self, result, stmt_index):
        if stmt_index > 0:
            yield ','
        yield json.dumps(str(result))

    def get_query_renderer(self, *args, **kw):
        return JsonQueryRenderer(*args, **kw)

class JsonQueryRenderer:
    def __init__(self, colnames, coltypes, stmt_index):
        self.colnames = colnames
        self.coltypes = coltypes
        self.first = True
        self.stmt_index = stmt_index

    @strjoin
    def render_intro(self):
        if self.stmt_index > 0:
            yield ','
        yield '['

    def render_outro(self):
        return ']'

    @strjoin
    def render_rows(self, rows):
        for row in rows:
            if self.first:
                self.first = False
            else:
                yield ','
            yield json.dumps(
                dict(zip(self.colnames, row)),
                ensure_ascii=False,
                default=str
            )


RENDERERS = {
    'map': MapRenderer(),
    'html': RegularRenderer(),
    'json': JsonRenderer(),
}
