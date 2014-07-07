import cgi, io, re, json, logging

from . import sqlsplit, regview, mapview

class QueryDatabaseAppHandler:
    mimetype = 'text/html'
    database = None
    _views = {
        'map': mapview.MapView(),
        'regular': regview.RegularView()
    }

    def __init__(self, environ):
        form = cgi.FieldStorage(
            fp=io.TextIOWrapper(
                io.BytesIO(environ['wsgi.input'].read()),
                encoding='utf-8',
                newline='\n'
            ),
            environ=environ,
            keep_blank_values=True
        )
        self._view = self._views.get(form.getfirst('view'),
                                     self._views['regular'])
        psql_query = form.getfirst('query')
        psql_pattern = r'(?ixs)^ \s* \\connect \s+ (\w+) (.*)'
        psql_match = re.match(psql_pattern, psql_query)
        if psql_match:
            self.database, query = psql_match.groups()
            self._query = query
            self._statements = sqlsplit.sqlsplit(query)


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
            if stmt.strip():
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
                colnames = [colname for colname, *_ in columns]
                coltypes = [coltype for _, coltype, *_ in columns]
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
                    yield from rowset_renderer.render_exception(fetch_err)
            else:
                yield self._view.render_nonquery(cursor.statusmessage)
