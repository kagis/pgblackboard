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

    resp_func, content_type = {
        'map': (map_response, 'text/html'),
        'html': (html_response, 'text/html'),
        'json': (json_response, 'application/json'),
    }[format or 'html']
    return ('200 OK',
        [('Content-type', content_type),
         ('uWSGI-Encoding', 'gzip')],
        process_sql(conn, resp_func, query, args)
    )


def process_sql(conn, resp_func, query, args):
    statements = (
        (lambda: stmt.chunks(*args)
            if stmt.column_names
            else stmt.first(*args),
        stmt.column_names,
        stmt.pg_column_types)
        for stmt in (
            conn.prepare(qry)
            for qry in split_sql_str(query)
            if qry
        )
    )
    try:
        with conn.xact():
            yield from resp_func(statements)
    finally:
        conn.close()


def json_response(statements):
    stmt = next(statements)
    get_result, colnames, _ = stmt
    yield json_dumps(
        [dict(zip(colnames, row))
        for rows in get_result()
        for row in rows],
        ensure_ascii=False
    )


def yield_per_none(fun):
    def wrapper(*args, **kw):
        buff = []
        for item in fun(*args, **kw):
            if item is None:
                yield ''.join(buff)
                buff = []
            else:
                buff.append(item)
        yield ''.join(buff)
    return wrapper


@yield_per_none
def map_response(statements):
    yield ('<html>'
        '<head>'
        '<link href="//cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.2/leaflet.css" rel="stylesheet" type="text/css" />'
        '<script>L_PREFER_CANVAS = true;</script>'
        '<script src="//cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.2/leaflet.js"></script>'
        '<link href="/map.css" rel="stylesheet" type="text/css" />'
        '</head>'
        '<body>'
        '<div id="map"></div>'
        '<script src="/map.js"></script>')
    yield None # flush

    for i, (get_result, colnames, coltypes) in enumerate(statements):
        geomcol_ix = colnames.index('geom')
        propnames = colnames[:geomcol_ix] + colnames[geomcol_ix+1:]
        for rows in get_result():
            yield '<script>addFeatureCollection('
            yield str(i)
            yield ','
            yield json_dumps({
                'type': 'FeatureCollection',
                'features': [{
                    'type': 'Feature',
                    'geometry': json_loads(row[geomcol_ix] or 'null'),
                    'properties': dict(zip(
                        propnames,
                        (x for i, x in enumerate(row)
                            if i != geomcol_ix)
                    ))
                } for row in rows]
            }, ensure_ascii=False)
            yield ')</script>'
            yield None # flush

    yield ('</body>'
        '</html>')


@yield_per_none
def html_response(statements):
    yield '<html>'
    yield '<head>'
    yield '<link href="/table.css?2" rel="stylesheet" type="text/css" />'
    yield '</head>'
    yield '<body>'

    exception = None
    has_statements = True
    statements = iter(statements)
    while has_statements and not exception:
        try:
            get_result, colnames, coltypes = next(statements)
        except StopIteration:
            has_statements = False
            continue
        except Exception as ex:
            exception = ex
            continue

        # execute non query
        if not colnames:
            try:
                nonqry_result = get_result()
            except Exception as ex:
                exception = ex
            else:
                yield '<p class="non-query-result">'
                yield str(nonqry_result)
                yield '</p>'
                yield None # flush
            continue

        # execute select
        yield '<table>'
        yield '<tr>'
        for name in colnames:
            yield '<th>'
            yield name
            yield '</th>'
        yield '</tr>'
        yield None # flush

        col_classes = [
            'int' if typ == 23 else 'str'
            for typ in coltypes
        ]

        chunks = get_result()
        has_chunks = True
        while has_chunks and not exception:
            try:
                rows = next(chunks)
            except StopIteration:
                has_chunks = False
            except Exception as ex:
                exception = ex
            else:
                for row in rows:
                    yield '<tr>'
                    for val, class_ in zip(row, col_classes):
                        yield '<td class="' + class_ + '">'
                        if val is None:
                            yield '<em>null</em>'
                        else:
                            yield str(val)[:100]
                        yield '</td>'
                    yield '</tr>'
                yield None # flush

        yield '</table>'

    if exception:
        yield '<pre class="error">'
        yield str(exception)
        yield '</pre>'

    yield '</body>'
    yield '</html>'
