import urllib.parse, json

from . import sql, regview, mapview


class QueryDatabaseAppHandler:
    mimetype = 'text/html'
    database = None
    _views = {
        'map': mapview.MapView(),
        'regular': regview.RegularView()
    }

    def __init__(self, environ):
        form = urllib.parse.parse_qs(environ['wsgi.input'].read().decode())
        self._view = self._views.get(form.get('view', ['regular'])[0])
        psql_query = form['query'][0]
        lines = psql_query.splitlines()
        psql_query = '\n'.join(lines)
        self._psql_query = psql_query

        selection = json.loads(form.get('selection', ['null'])[0])
        self.database, query, self._querypos = sql.extract_connect(psql_query)
        if selection:
            sel_start, sel_end = [
                sum(len(ln) + 1 for ln in lines[:row]) + col
                for row, col in selection
            ]
            query = psql_query[sel_start:sel_end]
            self._querypos = sel_start

        self._statements = sql.split(query)

    def on_connect_error(self, ex):
        yield ('<!doctype html>'
               '<html>'
               '<head></head>'
               '<body><pre style="color: red">{0}</pre></body>'
               '</html>').format(ex)

    def handle(self, cursor):
        return '200 OK', self.get_response(cursor)

    def get_response(self, cursor):
        yield ('<!doctype html>'
               '<html>'
               '<head>'
               '<meta charset="utf-8" />')
        yield self._view.render_head()
        yield ('</head>'
               '<body>')
        yield self._view.render_body_start()
        position_offset = self._querypos
        for stmt in self._statements:
            if sql.isnotempty(stmt):
                yield from self._exec_stmt(cursor, stmt, position_offset)
            position_offset += len(stmt)
        yield ('</body>'
               '</html>')

    def _exec_stmt(self, cursor, stmt, position_offset):
        query_parse_res = sql.parse_select(stmt)
        print(query_parse_res)
        editable = False
        if query_parse_res:
            tablename, colnames = query_parse_res
            try:
                cursor.execute(
                    'select attname from pg_index join pg_attribute '
                    'on attrelid = indrelid and attnum = any(indkey) '
                    'where pg_index.indrelid = %s::regclass and indisprimary',
                    [tablename]
                )
            except Exception as ex:
                print(ex)
            else:
                pk = {col for col, in cursor.fetchall()}
                pkmask = [colnm in pk for colnm in colnames]
                editable = bool(pk & set(colnames))

            try:
                cursor.execute(
                    'select nspname, relname '
                    'from pg_class join pg_namespace '
                    'on pg_class.relnamespace = pg_namespace.oid '
                    'where pg_class.oid = %s::regclass;',
                    [tablename]
                )
            except Exception as ex:
                print(ex)
            else:
                schemaname, tablename = cursor.fetchone()

        try:
            cursor.execute(stmt)
        except Exception as ex:
            yield self._view.render_exception(ex)
            try:
                errpos = int(ex.diag.statement_position)
            except:
                errpos = sql.notemptypos(stmt)
            errpos += position_offset
            errrow = self._psql_query.count('\n', 0, errpos)
            errscript = ('<script>'
                         'parent.pgbb.addQueryAnnotation({0});'
                         '</script>')
            yield errscript.format(json.dumps({
                'row': errrow,
                'column': 0,
                'text': str(ex),
                'type': 'error'
            }))

        else:
            if cursor.description:
                colaliases, coltypes = zip(*[(al, typ)
                    for al, typ, *_ in cursor.description
                ])
                if editable:
                    pass
                else:
                    colnames = [None] * len(colaliases)
                    pkmask = [False] * len(colaliases)
                    tablename = None
                    schemaname = None
                rowset_renderer = self._view.get_rowset_renderer(
                    list(zip(colaliases, colnames, coltypes, pkmask)),
                    tablename, schemaname, self.database
                )
                yield from rowset_renderer.render_intro()
                unfetched_rows_exist = True
                fetch_err = None
                while unfetched_rows_exist and not fetch_err:
                    try:
                        rows = cursor.fetchmany()
                    except Exception as ex:
                        fetch_err = ex
                    else:
                        unfetched_rows_exist = bool(rows)
                        if rows:
                            yield ''.join(
                                rowset_renderer.render_rows(rows)
                            )
                yield from rowset_renderer.render_outro()
                if fetch_err:
                    print(fetch_err)
                    yield from rowset_renderer.render_exception(fetch_err)
            else:
                yield self._view.render_nonquery(cursor.statusmessage)
