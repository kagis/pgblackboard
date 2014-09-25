import urllib.parse, json

from . import sql


class QueryDatabaseAppHandler:
    mimetype = 'text/html'
    database = None

    def __init__(self, view, environ):
        self._view = view
        form = urllib.parse.parse_qs(environ['wsgi.input'].read().decode())
        psql_query = form['query'][0]
        lines = psql_query.splitlines()
        psql_query = '\n'.join(lines)
        self._psql_query = psql_query

        selection = json.loads(form.get('selection', ['null'])[0])
        dbname_extraction_result = sql.extract_dbname(psql_query)
        if dbname_extraction_result:
            self.database, query, self._querypos = dbname_extraction_result
            if selection:
                sel_start, sel_end = [
                    sum(len(ln) + 1 for ln in lines[:row]) + col
                    for row, col in selection
                ]
                query = psql_query[sel_start:sel_end]
                self._querypos = sel_start

            self._statements = sql.split(query)

    def on_database_missing(self):
        yield from self._render_doc_intro()
        yield from self._view.render_exception(
            'Missing \connect database command on first line'
        )
        yield from self._render_doc_outro()

    def on_connect_error(self, ex):
        yield from self._render_doc_intro()
        yield from self._view.render_exception(ex)
        yield from self._render_doc_outro()

    def handle(self, cursor):
        return '200 OK', self.get_response(cursor)

    def get_response(self, cursor):
        yield from self._render_doc_intro()
        position_offset = self._querypos
        for stmt in self._statements:
            if sql.isnotempty(stmt):
                yield from self._exec_stmt(cursor, stmt, position_offset)
            position_offset += len(stmt)
        yield from self._render_doc_outro()

    def _render_doc_intro(self):
        yield ('<!doctype html>'
               '<html>'
               '<head>'
               '<meta charset="utf-8" />')
        yield self._view.render_head()
        yield ('</head>'
               '<body>')
        yield self._view.render_body_start()

    def _render_doc_outro(self):
        yield ('</body>'
               '</html>')

    def _exec_stmt(self, cursor, stmt, position_offset):
        query_parse_res = sql.parse_updatable_query(stmt)
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
                         'parent.pgbb.setError({0}, {1});'
                         '</script>')
            yield errscript.format(errrow, json.dumps(str(ex)))

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
                    yield from rowset_renderer.render_exception(fetch_err)
            else:
                yield self._view.render_nonquery(cursor.statusmessage)

        while cursor.connection.notices:
            yield self._view.render_notice(
                cursor.connection.notices.pop())
