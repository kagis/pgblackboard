import pkgutil, json, urllib.parse


class TreeDatabaseAppHandler:
    mimetype = 'application/json'

    def __init__(self, environ):
        qs = urllib.parse.parse_qs(environ['QUERY_STRING'])
        self._nodetype, = qs['nodetype']
        self._nodeid, = qs['nodeid']
        self.database, = qs['database']
        self.handle = {
            'children': self._get_children,
            'definition': self._get_definition
        }[qs['q'][0]]



    def on_connect_error(self, ex):
        yield json.dumps(str(ex))

    def handle(self, cursor):
        cursor.execute(self._sql, {
            'nodeid': self._nodeid,
            'nodetype': self._nodetype
        })
        colnames = [colname for colname, *_ in cursor.description]
        return '200 OK', [json.dumps([
            dict(zip(colnames, row))
            for row in cursor.fetchall()
        ])]

    def _get_definition(self, cursor):
        defquery = _def_queries[self._nodetype]
        cursor.execute(defquery, {
            'nodeid': self._nodeid,
            'nodetype': self._nodetype
        })
        return '200 OK', json.dumps({
            'definition': cursor.fetchone()[0]
        })

    def _get_children(self, cursor):
        childquery = _child_queries[self._nodetype]
        cursor.execute(childquery, {
            'nodeid': self._nodeid,
            'nodetype': self._nodetype
        })
        colnames = [colname for colname, *_ in cursor.description]
        dict_rows = [
            dict(zip(colnames, row))
            for row in cursor.fetchall()
        ]

        prev_row_group = None
        for row in dict_rows:
            row_group = row.get('group', 0)
            if prev_row_group is None:
                prev_row_group = row_group
            row['hasChildren'] = row['type'] in _child_queries
            row['database'] = self.database
            row['isGroupStart'] = row_group != prev_row_group
            prev_row_group = row_group

        return '200 OK', [json.dumps(dict_rows)]


_NODEMAP = (
      #node type      #children query            #definition query
     ('database'     ,'children/database.sql'   ,'def/database.sql'   )
    ,('schema'       ,'children/schema_ext.sql' ,'def/schema.sql'     )
    ,('extension'    ,'children/schema_ext.sql' ,'def/ext.sql'        )
    ,('table'        ,'children/rel.sql'        ,'def/rel.sql'        )
    ,('view'         ,'children/rel.sql'        ,'def/rel.sql'        )
    ,('matview'      ,'children/rel.sql'        ,'def/rel.sql'        )
    ,('foreigntable' ,'children/rel.sql'        ,'def/rel.sql'        )
    ,('agg'          ,None                      ,'def/agg.sql'        )
    ,('func'         ,None                      ,'def/func.sql'       )
    ,('column'       ,None                      ,'def/column.sql'     )
    ,('pkcolumn'     ,None                      ,'def/column.sql'     )
    ,('fkcolumn'     ,None                      ,'def/column.sql'     )
    ,('index'        ,None                      ,'def/index.sql'      )
    ,('trigger'      ,None                      ,'def/trigger.sql'    )
    ,('foreignkey'   ,None                      ,'def/constraint.sql' )
    ,('check'        ,None                      ,'def/constraint.sql' )
    ,('unique'       ,None                      ,'def/constraint.sql' )
)

def _ressql(filename):
    return pkgutil.get_data(
        'pgblackboard',
        'sql/' + filename
    )

_child_queries = { typ: _ressql(fn) for typ, fn, _ in _NODEMAP if fn }
_def_queries = { typ: _ressql(fn) for typ, _, fn in _NODEMAP }
