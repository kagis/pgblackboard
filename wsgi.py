from itertools import chain
from os import path
from base64 import b64decode
import re
import json

from postgresql.driver import connect
from postgresql.exceptions import ClientCannotConnectError, AuthenticationSpecificationError
from sqlparse import split as split_sql_str

from webob import Response, Request
from webob.dec import wsgify
from webob.exc import HTTPUnauthorized, HTTPNotFound, HTTPBadRequest
from webob.static import FileApp, DirectoryApp

from time import sleep
from pprint import pprint

base_dir = path.dirname(path.abspath(__file__))

index_app = FileApp(path.join(base_dir, 'index.html'))

def extract_database_from_query(query):
    lines = query.splitlines()
    if lines:
        database = re.findall(r'^\s*\\connect\s+(\w+)\s*$', lines[0])[0]
        query = '\n'.join(query_lines[1:])


_valid_credentials = dict()

def credentials_are_valid(user, password, req):
    if not(user and password):
        return False
    try:
        if user in _valid_credentials:
            return _valid_credentials[user] == password
        else:
            db = connect(
                user=user,
                password=password,
                host=req.environ['postgresql.host'],
                database='postgres',
                port=int(req.environ['postgresql.port'])
            )
    except ClientCannotConnectError:
        return False
    else:
        db.close()
        _valid_credentials[user] = password
        return True



@wsgify.middleware
def authorize(req, app):
    auth = req.authorization
    b64cred = auth[1] if auth else ''
    cred = b64decode(b64cred).decode('utf8').split(':', 1)
    cred = cred if len(cred) == 2 else (None, None)
    user, password = cred
    if not credentials_are_valid(user, password, req):
        return HTTPUnauthorized(
            www_authenticate = 'Basic realm="main"'
        )
    req.environ['postgresql.user'] = user
    req.environ['postgresql.password'] = password
    return app


@authorize
@wsgify
def application(req):
    slug = req.path_info_peek()
    if slug == 'sql':
        req.path_info_pop()
        return sql_app
    elif not slug:
        return index_app
    else:
        return HTTPNotFound()


@wsgify
def sql_app(req):
    query = req.params['query']
    format = req.params.get('format')
    args = req.params.getall('arg')
    database = req.params.get('database')
    connect_match = re.match(r'(?ixs)^ \s* \\connect \s+ (\w+) \s* (.*)', query)
    if connect_match:
        database, query = connect_match.groups()

    if not database:
        return HTTPBadRequest()

    db = connect(
        user=req.environ['postgresql.user'],
        password=req.environ['postgresql.password'],
        host=req.environ['postgresql.host'],
        port=int(req.environ['postgresql.port']),
        database=database,
    )

    statements = (
        (lambda: stmt.chunks(*args)
            if stmt.column_names
            else stmt.first(*args),
        stmt.column_names,
        stmt.pg_column_types)
        for stmt in (
            db.prepare(qry)
            for qry in split_sql_str(query)
            if qry
        )
    )

    resp_func, content_type = {
        'map': (map_response, 'text/html'),
        'html': (html_response, 'text/html'),
        'json': (json_response, 'application/json'),
    }[format or 'html']

    with db.xact():
        return Response(
            content_type=content_type,
            app_iter=iter_utf8(iter_chunks(resp_func(statements)))
        )

def json_response(statements):
    stmt = next(statements)
    exec, colnames, _ = stmt
    yield json.dumps(
        [dict(zip(colnames, row))
        for rows in exec()
        for row in rows],
        ensure_ascii=False
    )

def map_response(statements):
    yield ('<html>'
        '<head>'
        '<link href="//cdn.leafletjs.com/leaflet-0.7.2/leaflet.css" rel="stylesheet" type="text/css" />'
        '<script>L_PREFER_CANVAS = true;</script>'
        '<script src="//cdn.leafletjs.com/leaflet-0.7.2/leaflet.js"></script>'
        '<link href="/map.css" rel="stylesheet" type="text/css" />'
        '</head>'
        '<body>'
        '<div id="map"></div>'
        '<script src="/map.js"></script>')
    yield None # flush

    for i, (exec, colnames, coltypes) in enumerate(statements):
        geomcol_ix = colnames.index('geom')
        propnames = colnames[:geomcol_ix] + colnames[geomcol_ix+1:]
        for rows in exec():
            yield '<script>addFeatureCollection('
            yield str(i)
            yield ','
            yield json.dumps({
                'type': 'FeatureCollection',
                'features': [{
                    'type': 'Feature',
                    'geometry': json.loads(row[geomcol_ix] or 'null'),
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
            exec, colnames, coltypes = next(statements)
        except StopIteration:
            has_statements = False
            continue
        except Exception as ex:
            exception = ex
            continue

        # execute non query
        if not colnames:
            try:
                nonqry_result = exec()
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

        chunks = exec()
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


def iter_chunks(items):
    buff = []
    for item in items:
        if item is None:
            yield ''.join(buff)
            buff = []
        else:
            buff.append(item)
    yield ''.join(buff)


def iter_utf8(items):
    for item in items:
        yield item.encode('utf8')

