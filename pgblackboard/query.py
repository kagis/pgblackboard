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

            self._statements = list(sql.split(query))

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
               '<body class="bg-panel">'
               '<script>parent.pgbb.initResult(window);</script>'
               '<div class="main">')
        yield self._view.render_body_start()

    def _render_doc_outro(self):
        yield ('</div>'
               '</body>'
               '</html>')

    def _pop_and_render_notices(self, cursor):
        while cursor.connection.notices:
            yield self._view.render_notice(
                cursor.connection.notices.pop(0)
            )

    def _exec_stmt(self, cursor, stmt, position_offset):
        query_parse_res = sql.try_get_selecting_table_and_cols(stmt)
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
            try:
                cursor.execute(stmt)
            finally:
                yield from self._pop_and_render_notices(cursor)
        except Exception as ex:
            yield self._view.render_exception(ex)
            try:
                errpos = int(ex.diag.statement_position)
            except:
                errpos = sql.notemptypos(stmt)
            errpos += position_offset
            errrow = self._psql_query.count('\n', 0, errpos)
            yield _jsinvoke('pgbb.setError', errrow, str(ex))

        else:
            if cursor.description and \
                    len(cursor.description) == 1 and \
                    cursor.description[0][1] == 114 and \
                    cursor.description[0][0] == 'QUERY PLAN':
                plan, = cursor.fetchone()
                yield from self._render_query_plan(
                    self._prepare_queryplan(plan)
                )

            elif cursor.description:
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


    _query_plan_assets_included = False
    def _render_query_plan(self, plan):
        if not self._query_plan_assets_included:
            self._query_plan_assets_included = True
            yield ('<link href="static/queryplan.css" rel="stylesheet" />'
                   '<script src="static/lib-src/d3/3.4.11/d3.js"></script>'
                   '<script src="static/lib-src/dagre-d3/0.2.9/dagre-d3.js"></script>'
                   '<script src="static/queryplan.js"></script>')
        yield _jsinvoke('queryPlan', plan);

    def _prepare_queryplan(self, plan):

        nodes = []

        def flatten_nodes(node):
            node['_type'] = node['Node Type']
            del node['Node Type']
            node_index = len(nodes)
            nodes.append(node)
            if 'Plans' in node:
                for child in node['Plans']:
                    child['_parentIndex'] = node_index
                    flatten_nodes(child)
                del node['Plans']

        flatten_nodes(plan[0]['Plan'])

        cost_prop = ([p
            for p in ['Actual Total Time', 'Total Cost']
            if p in nodes[0]
        ] or [None])[0]

        if cost_prop:
            for node in nodes:
                node['_cost'] = node[cost_prop]

            for node in nodes:
                if '_parentIndex' in node:
                    nodes[node['_parentIndex']]['_cost'] -= node['_cost']

            mincost = min(n['_cost'] for n in nodes)
            maxcost = max(n['_cost'] for n in nodes)
            cost_d = maxcost - mincost
            cost_factor = cost_d and 1 / cost_d;

            for node in nodes:
                node['_cost'] = (node['_cost'] - mincost) * cost_factor

        return {
            'nodes': nodes
        }



def _jsinvoke(fun, *args):
    return ''.join((
        '<script>'
        ,fun
        ,'('
        ,','.join(json.dumps(x) for x in args)
        ,')'
        ,';'
        ,'</script>'
    ))
