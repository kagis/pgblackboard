import optparse, logging

import cherrypy

import pgblackboard


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
    logging.info('{REMOTE_ADDR} {HTTP_USER_AGENT} - {REQUEST_METHOD} '
                  '{PATH_INFO}?{QUERY_STRING}'.format(**environ))
    yield from pgblackboard.application(environ, start_response)


logging.basicConfig(level=logging.INFO)

cherrypy.config.update({
    'server.socket_port': options.http_port,
    'server.socket_host': options.http_host,
    'server.ssl_certificate': options.ssl_cert,
    'server.ssl_private_key': options.ssl_privkey
})

cherrypy.tree.graft(app, '/')
cherrypy.engine.start()
cherrypy.engine.block()
