import pkgutil, json, urllib.parse


class TreeDatabaseAppHandler:
    mimetype = 'application/json'

    def __init__(self, environ):
        qs = urllib.parse.parse_qs(environ['QUERY_STRING'])
        self._sql = _queries[qs['q'][0]]
        self._node, = qs.get('node', [None])
        self.database, = qs['database']

    def on_connect_error(self, ex):
        yield json.dumps(str(ex))

    def handle(self, cursor):
        cursor.execute(self._sql, { 'node': self._node })
        colnames = [colname for colname, *_ in cursor.description]
        return '200 OK', [json.dumps([
            dict(zip(colnames, row))
            for row in cursor.fetchall()
        ])]

_queries = { nm: pkgutil.get_data('pgblackboard',
                                  'sql/{0}.sql'.format(nm)) for nm in [
    'columns_in_rel',
    'databases',
    'func_def',
    'rels_and_funcs_in_schema',
    'extension_children',
    'schemas_in_db',
    'table_def',
    'index_def',
    'trigger_def',
    'constraint_def',
    'column_def',
    'schema_def',
    'extension_def',
]}
