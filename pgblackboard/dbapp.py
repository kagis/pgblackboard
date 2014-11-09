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
            user, password = base64.b64decode(b64cred.encode('ascii')) \
                                    .decode().split(':', 1)
        except Exception as ex:
            print(ex)
            start_response('401 Unauthorized', [
                ('Content-type', 'text/plain'),
                ('WWW-Authenticate', 'Basic realm="postgresql"')
            ])
            yield b'Unexpected credentials format.'
            return

        handler = self._handler_factory(environ)

        if not handler.database:
            start_response('400 Bad Request', [
                ('Content-type', handler.mimetype + '; charset=utf-8')
            ])
            for x in handler.on_database_missing():
                yield x.encode()
            return


        dsn = dict(
            user=user,
            password=password,
            host=environ.get('postgresql.host', 'localhost'),
            port=int(environ.get('postgresql.port', 5432)),
            database=handler.database
        )

        try:
            conn = self._dbapi20.connect(**dsn)
        except Exception as ex:
            if self._check_authfail(ex):
                start_response('401 Unauthorized', [
                    ('Content-type', 'text/plain'),
                    ('WWW-Authenticate', 'Basic realm="postgresql"')
                ])
                yield b'Invalid user name or password.'
                return

            start_response('500 Internal Server Error', [
                ('Content-type', handler.mimetype + '; charset=utf-8')
            ])
            for x in handler.on_connect_error(ex):
                yield x.encode()
            return



        try:
            conn.autocommit = True
            cursor = conn.cursor()
            cursor.arraysize = 50
            status, app_iter = handler.handle(cursor)
            start_response(status, [
                ('Content-type', handler.mimetype + '; charset=utf-8'),
                ('uWSGI-Encoding', 'gzip')
            ])
            for x in app_iter:
                yield x.encode()
        finally:
            conn.close()


    def _check_authfail(self, ex):
        errmsg = str(ex)
        return (
            errmsg == 'ERROR:  Auth failed\n' or
            errmsg == 'fe_sendauth: no password supplied\n' or
            (errmsg.startswith('FATAL:  role ') and errmsg.endswith(' does not exist\n')) or
            errmsg.startswith('FATAL:  password authentication failed for user')
        )