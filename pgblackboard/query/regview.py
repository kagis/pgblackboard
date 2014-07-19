import json, html


class RegularView:
    def render_head(self):
        return ('<link href="assets/table/table.css" rel="stylesheet" />'
                '<script src="assets/table/table.js"></script>')

    css = ['assets/table/table.css']
    js = ['assets/table/table.js']

    def render_body_start(self):
        return ''

    def render_exception(self, exception):
        return '<pre class="error">{0}</pre>'.format(exception)

    def render_nonquery(self, result):
        return '<p class="non-query-result">{0}</p>'.format(result)

    class get_rowset_renderer:
        def __init__(self, columns, table, schema, database):
            self._database = database
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
            yield '<style>'
            yield numeric_td_selector
            yield '{text-align:right}'
            yield '</style>'

            yield '<table id="' + table_elem_id + '"'
            if self._table and self._schema and self._database:
                yield ' data-table="' + self._table + '"'
                yield ' data-schema="' + self._schema + '"'
                yield ' data-database="' + self._database + '"'
            yield ('>'
                   '<thead>'
                   '<tr>'
                   '<th>#</th>')
            for alias, name, typ, iskey in self._columns:
                yield '<th'
                if name:
                    yield ' data-name="' + name + '"'
                if iskey:
                    yield ' data-key="true"'
                yield '>'
                yield alias
                yield '</th>'
            yield ('</tr>'
                   '</thead>'
                   '<tbody>')

        def render_outro(self):
            yield ('</tbody>'
                   '</table>')

        def render_rows(self, rows):
            for row in rows:
                yield '<tr>'
                yield '<td></td>' #rownum
                for val, render in zip(row, self._colrenderers):
                    yield '<td contenteditable="plaintext-only"'
                    if val is None:
                        yield ' class="null"'
                    yield '>'
                    if val is not None:
                        yield html.escape(render(val))
                    yield '</td>'
                yield '</tr>'

def render_json(obj):
    return json.dumps(obj, ensure_ascii=False, indent=2, default=str)
