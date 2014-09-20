import json, html


class TableView:
    def render_head(self):
        return ('<link href="assets/table/table.css" rel="stylesheet" />'
                '<script src="assets/table/table.js" async="async"></script>')

    def render_body_start(self):
        return ''

    def render_exception(self, exception):
        return '<pre class="error">{0}</pre>'.format(exception)

    def render_nonquery(self, result):
        return '<p class="non-query-result">{0}</p>'.format(result)

    class get_rowset_renderer:
        def __init__(self, columns, table, schema, database):
            self._database = database
            self._can_insert = bool(table)
            self._table = table
            self._schema = schema
            self._columns = columns
            self._colisnum = [
                typ in (20, 21, 23, 26, 700, 701, 790, 1700, 11499)
                for _, __, typ, ___ in columns
            ]
            self._colrenderers = [
                render_json if typ == 114 else str
                for _, __, typ, ___ in columns
            ]

        def render_intro(self):
            table_elem_id = 'table{0}'.format(id(self))
            numeric_td_selector = ','.join(
                '#{0} td:nth-child({1})'.format(table_elem_id, i)
                for i, isnum in enumerate(self._colisnum, 2)
                if isnum
            )
            yield tagopen('style')
            yield numeric_td_selector
            yield '{text-align:right}'
            yield tagclose('style')

            yield tagopen('table', {
                'id': table_elem_id,
                'data-table': self._table,
                'data-schema': self._schema,
                'data-database': self._database
            })



            yield tagopen('thead')
            yield tagopen('tr')
            yield tag('th', '')
            for alias, name, type_, iskey in self._columns:
                yield  tagopen('th', {
                    'data-name': name,
                    'data-key': iskey or None
                })
                yield tag('div', alias)
                yield tag('small', PGTYPES.get(type_, str(type_)), { 'class': 'coltype' })
                yield tagclose('th')
            yield tagclose('tr')
            yield tagclose('thead')

            yield tagopen('tbody', {
                'class': self._can_insert and 'has-blankrow'
            })

        def render_outro(self):
            if self._can_insert:
                yield tagopen('tr')
                yield tag('td', '')
                editable_td = tag('td', '', {'contenteditable': 'plaintext-only'})
                yield editable_td * len(self._columns)
                yield tagclose('tr')
            yield tagclose('tbody')
            yield tagclose('table')

        def render_rows(self, rows):
            for row in rows:
                yield '<tr>'
                yield '<td></td>' #rownum
                for val, render in zip(row, self._colrenderers):
                    yield '<td>'
                    if val is not None:
                        yield html.escape(render(val))
                    yield '</td>'
                yield '</tr>'

        def render_exception(self, ex):
            yield '<pre style="color: red">'
            yield str(ex)
            yield '</pre>'

def render_json(obj):
    return json.dumps(obj, ensure_ascii=False, indent=2, default=str)



import html


def strbuilder(fun):
    def wrapper(*args, **kw):
        return ''.join(fun(*args, **kw))
    return wrapper


@strbuilder
def tagopen(tagname, attrs=dict()):
    yield '<'
    yield tagname
    for attname, attval in attrs.items():
        if attval:
            yield ' '
            yield attname
            yield '='
            yield html.escape(str(attval))
    yield '>'


@strbuilder
def tagclose(tagname):
    yield '</'
    yield tagname
    yield '>'


@strbuilder
def tag(tagname, content, attrs=dict()):
    yield tagopen(tagname, attrs)
    yield html.escape(str(content))
    yield tagclose(tagname)


PGTYPES = {
    16: 'bool',
    17: 'bytea',
    18: 'char',
    19: 'name',
    20: 'int8',
    21: 'int2',
    22: 'nt2vector[]',
    23: 'int4',
    24: 'regproc',
    25: 'text',
    26: 'oid',
    27: 'tid',
    28: 'xid',
    29: 'cid',
    30: 'idvector[]',
    71: 'pg_type',
    75: 'pg_attribute',
    81: 'pg_proc',
    83: 'pg_class',
    114: 'json',
    142: 'xml',
    143: 'xml[]',
    199: 'json[]',
    194: 'pg_node_tree',
    210: 'smgr',
    600: 'point',
    601: 'lseg',
    602: 'path',
    603: 'box',
    604: 'polygon',
    628: 'line',
    629: 'line[]',
    700: 'float4',
    701: 'float8',
    702: 'abstime',
    703: 'reltime',
    704: 'tinterval',
    705: 'unknown',
    718: 'circle',
    719: 'circle[]',
    790: 'money',
    791: 'money[]',
    829: 'macaddr',
    869: 'inet',
    650: 'cidr',
    1000: 'bool[]',
    1001: 'bytea[]',
    1002: 'char[]',
    1003: 'name[]',
    1005: 'int2[]',
    1006: 'int2vector[]',
    1007: 'int4[]',
    1008: 'regproc[]',
    1009: 'text[]',
    1028: 'oid[]',
    1010: 'tid[]',
    1011: 'xid[]',
    1012: 'cid[]',
    1013: 'oidvector[]',
    1014: 'bpchar[]',
    1015: 'varchar[]',
    1016: 'int8[]',
    1017: 'point[]',
    1018: 'lseg[]',
    1019: 'path[]',
    1020: 'box[]',
    1021: 'float4[]',
    1022: 'float8[]',
    1023: 'abstime[]',
    1024: 'reltime[]',
    1025: 'tinterval[]',
    1027: 'polygon[]',
    1033: 'aclitem',
    1034: 'aclitem[]',
    1040: 'macaddr[]',
    1041: 'inet[]',
    651: 'cidr[]',
    1263: 'cstring[]',
    1042: 'bpchar',
    1043: 'varchar',
    1082: 'date',
    1083: 'time',
    1114: 'timestamp',
    1115: 'timestamp[]',
    1182: 'date[]',
    1183: 'time[]',
    1184: 'timestamptz',
    1185: 'timestamptz[]',
    1186: 'interval',
    1187: 'interval[]',
    1231: 'numeric[]',
    1266: 'timetz',
    1270: 'timetz[]',
    1560: 'bit',
    1561: 'bit[]',
    1562: 'varbit',
    1563: 'varbit[]',
    1700: 'numeric',
    1790: 'refcursor',
    2201: 'refcursor[]',
    2202: 'regprocedure',
    2203: 'regoper',
    2204: 'regoperator',
    2205: 'regclass',
    2206: 'regtype',
    2207: 'regprocedure[]',
    2208: 'regoper[]',
    2209: 'regoperator[]',
    2210: 'regclass[]',
    2211: 'regtype[]',
    2950: 'uuid',
    2951: 'uuid[]',
    3614: 'tsvector',
    3642: 'gtsvector',
    3615: 'tsquery',
    3734: 'regconfig',
    3769: 'regdictionary',
    3643: 'tsvector[]',
    3644: 'gtsvector[]',
    3645: 'tsquery[]',
    3735: 'regconfig[]',
    3770: 'regdictionary[]',
    2970: 'txid_snapshot',
    2949: 'txid_snapshot[]',
    3904: 'int4range',
    3905: 'int4range[]',
    3906: 'numrange',
    3907: 'numrange[]',
    3908: 'tsrange',
    3909: 'tsrange[]',
    3910: 'tstzrange',
    3911: 'tstzrange[]',
    3912: 'daterange',
    3913: 'daterange[]',
    3926: 'int8range',
    3927: 'int8range[]',
    2249: 'record',
    2287: '_record',
    2275: 'cstring',
    2276: 'any',
    2277: 'anyarray',
    2278: 'void',
    2279: 'trigger',
    3838: 'event_trigger',
    2280: 'language_handler',
    2281: 'internal',
    2282: 'opaque',
    2283: 'anyelement',
    2776: 'anynonarray',
    3500: 'anyenum',
    3115: 'fdw_handler',
    3831: 'anyrange',
}
