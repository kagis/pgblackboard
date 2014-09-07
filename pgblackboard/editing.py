import json


class EditDatabaseAppHandler:
    mimetype = 'application/json'
    database = None

    def __init__(self, environ):
        self._form = json.loads(environ['wsgi.input'].read().decode())
        self._table = self._form['table']
        self._schema = self._form['schema']
        self._action = self._form['action']
        self.database = self._form['database']

    def on_connect_error(self, ex):
        yield json.dumps(str(ex))

    def _update_query(self):
        return 'update {0}.{1} set {2} where {3} returning *'.format(
            quote_ident(self._schema),
            quote_ident(self._table),
            ','.join(map(col_eq_val, *zip(*self._form['changes'].items()))),
            ' and '.join(map(col_eq_val, *zip(*self._form['where'].items())))
        )

    def _insert_query(self):
        cols, vals = zip(*self._form['changes'].items())
        return 'insert into {0}.{1} ({2}) values({3}) returning *'.format(
            quote_ident(self._schema),
            quote_ident(self._table),
            ','.join(map(quote_ident, cols)),
            ','.join(map(quote_literal, vals))
        )

    def _delete_query(self):
        return 'delete from {0}.{1} where {2} returning *'.format(
            quote_ident(self._schema),
            quote_ident(self._table),
            ' and '.join(map(col_eq_val, *zip(*self._form['where'].items())))
        )

    def handle(self, cursor):
        query = {
            'insert': self._insert_query,
            'update': self._update_query,
            'delete': self._delete_query
        }[self._action]()
        try:
            cursor.execute(query)
        except Exception as ex:
            return '400 Bad Request', [json.dumps(str(ex))]
        else:
            if cursor.rowcount == 1:
                returning_row = dict(zip(
                    (colname for colname, *_ in cursor.description),
                    map(lambda x: '' if x is None else str(x), cursor.fetchone())
                ))
                return '200 OK', [json.dumps(returning_row)]
            elif cursor.rowcount == 0:
                return '400 Bad Request', ['"No rows affected."']
            elif cursor.rowcount > 1:
                return '400 Bad Request', ['"More then one rows affected."']


def col_eq_val(colname, value):
    return quote_ident(colname) + ' = ' + quote_literal(value)


def quote_ident(unquoted):
    return '"' + unquoted.replace('"', '""') + '"'


def quote_literal(obj):
    return 'null' if obj is None else 'e' + repr(str(obj))
