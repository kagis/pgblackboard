import json, html

from . import pgtypes


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
                pgtypes.isnum(typid)
                for _, __, typid, ___ in columns
            ]
            self._colrenderers = [
                pgtypes.get_type_renderer(typid)
                for _, __, typid, ___ in columns
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
            for alias, name, typid, iskey in self._columns:
                yield  tagopen('th', {
                    'data-name': name,
                    'data-key': iskey or None
                })
                yield tag('div', alias)
                yield tag('small', pgtypes.get_type_name(typid), { 'class': 'coltype' })
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
                        yield render(val)
                    yield '</td>'
                yield '</tr>'

        def render_exception(self, ex):
            yield '<pre style="color: red">'
            yield str(ex)
            yield '</pre>'


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
