import base64


class DatabaseApp:
    def __init__(self, dbapi20, handler_factory):
        self._dbapi20 = dbapi20
        self._handler_factory = handler_factory

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
            print(ex)
            start_response('400 Bad Request', [
                ('Content-type', 'text/plain')
            ])
            yield b'Unexpected credentials format.'
            return

        handler = self._handler_factory(environ)

        try:
            conn = self._dbapi20.connect(
                user=user,
                password=password,
                host=environ.get('postgresql.host', 'localhost'),
                port=int(environ.get('postgresql.port', 5432)),
                database=handler.database
            )
        except Exception as ex:
            if str(ex) == 'ERROR:  Auth failed\n':
                start_response('401 Unauthorized', [
                    ('Content-type', 'text/plain'),
                    ('WWW-Authenticate', 'Basic realm="postgresql"')
                ])
                yield b'Invalid user name or password.'
                return

            start_response('500 Internal Server Error', [
                ('Content-type', handler.mimetype + '; charset=utf-8')
            ])
            yield from (x.encode() for x in handler.on_connect_error(ex))
            return


        with conn:
            conn.autocommit = True
            with conn.cursor() as cursor:
                cursor.arraysize = 50;
                status, app_iter = handler.handle(cursor)
                start_response(status, [
                    ('Content-type', handler.mimetype + '; charset=utf-8'),
                    ('uWSGI-Encoding', 'gzip')
                ])
                yield from (x.encode() for x in app_iter)
