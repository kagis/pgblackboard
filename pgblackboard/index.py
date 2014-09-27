import pkgutil, json


_index_html = pkgutil.get_data(
    'pgblackboard',
    'static/index.html'
).decode()


class IndexDatabaseAppHandler:
    mimetype = 'text/html'
    database = None

    def __init__(self, environ):
        self.database = 'postgres'

    def on_connect_error(self, ex):
        yield str(ex)

    def handle(self, cursor):
        cursor.execute('''
            SELECT datname AS name
                  ,shobj_description(oid, 'pg_database') AS comment
            FROM pg_database
            WHERE NOT datistemplate
        ''')

        initial_data = {
            'databases': [{
                'name': name,
                'comment': comment,
                'database': name,
                'childquery': 'schemas_in_db',
                'type': 'database'
            } for name, comment in cursor.fetchall()]
        }

        result = _index_html.replace(
            '/*INITIAL_DATA_PLACEHOLDER*/',
            json.dumps(initial_data)
        )

        return '200 OK', [result]
