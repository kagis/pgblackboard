import optparse

import pgblackboard
import pgblackboard.wsgiserver.ssl_builtin
import pgblackboard.wsgiserver


parser = optparse.OptionParser()

parser.add_option('--http-host',
    help='HTTP host to listen, default is 0.0.0.0',
    default='0.0.0.0'
)

parser.add_option('--http-port',
    help='HTTP port to listen, default is 7890',
    type='int',
    default=7890
)

parser.add_option('--pg-host',
    help='PostgreSQL server host, default is localhost',
    default='localhost'
)

parser.add_option('--pg-port',
    help='PostgreSQL server port, default is 5432',
    type='int',
    default=5432
)

parser.add_option('--ssl-cert',
    help="SSL certificate filename"
)

parser.add_option('--ssl-privkey',
    help="SSL private key filename"
)

options, _ = parser.parse_args()


def app(environ, start_response):
    environ['postgresql.port'] = options.pg_port
    environ['postgresql.host'] = options.pg_host
    print('{REMOTE_ADDR} {HTTP_USER_AGENT} - {REQUEST_METHOD} '
                  '{PATH_INFO}?{QUERY_STRING}'.format_map(environ))
    return pgblackboard.application(environ, start_response)


bind_addr = (options.http_host, options.http_port)
server =  pgblackboard.wsgiserver.CherryPyWSGIServer(bind_addr, app)

using_ssl = options.ssl_cert and options.ssl_privkey

if using_ssl:
    server.ssl_adapter = pgblackboard.wsgiserver.ssl_builtin.BuiltinSSLAdapter(
        options.ssl_cert, options.ssl_privkey
    )

print('start listening on {0}://{1}:{2}'.format(
    'https' if using_ssl else 'http',
    *bind_addr
))

server.start()
