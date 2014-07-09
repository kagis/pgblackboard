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
        self._psql_query = form['query'][0]
        #selection_start = form.get('selection_start', [0])[0]
        #selection_end = form.get('selection_end', [len(psql_query) - 1])[0]
        self.database, query, self._querypos = sql.extract_connect(self._psql_query)
        self._statements = sql.split(query)

    def on_connect_error(self, start_response, ex):
        start_response('200 OK', [
            ('Content-type', 'text/html; charset=utf-8')
        ])
        yield ('<!doctype html>'
               '<html>'
               '<head></head>'
               '<body><pre style="color: red">{0}</pre></body>'
               '</html>').format(ex)

    def get_response(self, cursor):
        yield ('<!doctype html>'
               '<html>'
               '<head>')
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
            columns = cursor.description
            if columns:
                colnames, coltypes = zip(*[
                    (colname, coltype)
                    for colname, coltype, *_ in columns
                ])
                rowset_renderer = self._view.get_rowset_renderer(colnames,
                                                                 coltypes)
                yield from rowset_renderer.render_intro()
                unfetched_rows_exist = True
                fetch_err = None
                rowscount = 0
                while unfetched_rows_exist and not fetch_err:
                    try:
                        rows = cursor.fetchmany()
                    except Exception as ex:
                        fetch_err = ex
                    else:
                        unfetched_rows_exist = bool(rows)
                        if rows:
                            yield ''.join(
                                rowset_renderer.render_rows(rows, rowscount)
                            )
                            rowscount += len(rows)
                yield from rowset_renderer.render_outro()
                if fetch_err:
                    print(fetch_err)
                    yield from rowset_renderer.render_exception(fetch_err)
            else:
                yield self._view.render_nonquery(cursor.statusmessage)
