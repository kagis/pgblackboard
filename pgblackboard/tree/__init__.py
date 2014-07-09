import pkgutil, json, urllib.parse


class TreeDatabaseAppHandler:
    mimetype = 'application/json'

    def __init__(self, environ):
        qs = urllib.parse.parse_qs(environ['QUERY_STRING'])
        self._sql = _queries[qs['q'][0]]
        self._oid = int(qs.get('oid', ['0'])[0])
        self.database = qs['database'][0]

    def on_connect_error(self, start_response, ex):
        start_response('500 Internal Server Error', [
            ('Content-type', 'text/html; charset=utf-8')
        ])
        yield ('<!doctype html>'
               '<html>'
               '<head></head>'
               '<body><pre style="color: red">{0}</pre></body>'
               '</html>').format(ex)

    def get_response(self, cursor):
        cursor.execute(self._sql, { 'oid': self._oid })
        colnames = [colname for colname, *_ in cursor.description]
        yield json.dumps([
            dict(zip(colnames, row))
            for row in cursor.fetchall()
        ])

_queries = { nm: pkgutil.get_data('pgblackboard.tree',
                                  'sql/{0}.sql'.format(nm)) for nm in [
    'columns_in_rel',
    'databases',
    'func_def',
    'matview_def',
    'rels_and_funcs_in_schema',
    'extension_children',
    'schemas_in_db',
    'table_def',
    'view_def'
]}
