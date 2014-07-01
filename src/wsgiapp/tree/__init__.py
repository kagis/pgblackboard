import pkgutil
import json
import wsgiref.util
import urllib.parse


class DatabaseApp:
    def __init__(self, dbapi20, handler):
        self._dbapi20 = dbapi20
        self._handler = handler

    def __call__(self, environ, start_response):
        try:
            auth = environ['HTTP_AUTHORIZATION']
        except KeyError:
            start_response('401 Unauthorized', [
                ('Content-type', 'text/plain'),
                ('WWW-Authenticate', 'Basic realm="postgresql"')
            ])
            yield b'User name and password required.'
            return

        try:
            auth_scheme, b64cred = auth.split(' ', 1)
            user, password = base64.b64decode(b64cred).decode().split(':', 1)
        except:
            start_response('400 Bad Request', [
                ('Content-type', 'text/plain')
            ])
            yield b'Unexpected credentials format.'
            return

        database = self._handler.get_database_name(environ)

        try:
            conn = self._dbapi20.connect(
                user=user,
                password=password,
                host=environ.get('postgresql.host', 'localhost'),
                port=int(environ.get('postgresql.port', 5432)),
                database=database,
            )
        except Exception as ex:
            # have no idea how detect auth error only
            print(ex)
            start_response('401 Unauthorized', [
                ('Content-type', 'text/plain'),
                ('WWW-Authenticate', 'Basic realm="postgresql"')
            ])
            yield b'Invalid user name or password.'

        with conn:
            start_response('200 OK', [
                ('Content-type', renderer.mime_type),
                ('uWSGI-Encoding', 'gzip')
            ])
            yield from self._handler.get_response(conn, environ)


class TreeWSGIApp:
    def __init__(self, cursor):
        self._cursor = cursor

    def __call__(self, environ, start_response):
        qs = urllib.parse.parse_qs(environ['QUERY_STRING'])
        sql = pkgutil.get_data('wsgiapp.tree', qs['q'][0])
        oid = int(qs['oid'][0])
        cursor.execute(sql, )
