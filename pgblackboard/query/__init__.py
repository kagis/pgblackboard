import urllib.parse, re, json

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
        #selection_start = form.get('selection_start', [0])[0]
        #selection_end = form.get('selection_end', [len(psql_query) - 1])[0]
        psql_pattern = r'(?ixs)^ \s* \\connect \s+ (\w+) (.*)'
        psql_match = re.match(psql_pattern, psql_query)
        if psql_match:
            self.database, query = psql_match.groups()
            self._query = query
            self._statements = sql.split(query)


    def get_response(self, cursor):
        yield ('<!doctype html>'
               '<html>'
               '<head>')
        yield self._view.render_head()
        yield ('</head>'
               '<body>')
        yield self._view.render_body_start()
        position_offset = 0
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
                errpos = re.search(r'\S', stmt).start()
            errpos += position_offset
            errrow = self._query.count('\n', 0, errpos)
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
