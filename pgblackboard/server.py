#~/usr/bin/env python3

import optparse, json, logging

import cherrypy

import pgblackboard


parser = optparse.OptionParser()
parser.add_option('-c', '--conf',
    dest='confpath',
    help="Configuration file"
)

options, _ = parser.parse_args()


def app(environ, start_response):
    logging.info('{REMOTE_ADDR} {HTTP_USER_AGENT} - {REQUEST_METHOD} '
                  '{PATH_INFO}?{QUERY_STRING}'.format(**environ))
    environ['postgresql.port'] = conf['postgresql_port']
    environ['postgresql.host'] = conf['postgresql_host']
    yield from pgblackboard.application(environ, start_response)



conf = {
    'http_host': '0.0.0.0',
    'http_port': 7890,
    'postgresql_host': 'localhost',
    'postgresql_port': 5432
}

if options.confpath:
    conf.update(json.loads(open(options.confpath).read()))

cherrypy.config.update({
    'server.socket_port': conf['http_port'],
    'server.socket_host': conf['http_host']
})

if 'ssl_certificate' in conf and 'ssl_private_key' in conf:
    cherrypy.config.update({
        'server.ssl_certificate': conf['ssl_certificate'],
        'server.ssl_private_key': conf['ssl_private_key']
    })

logging.basicConfig(level=logging.INFO)

cherrypy.tree.graft(app, '/')
cherrypy.engine.start()
cherrypy.engine.block()
