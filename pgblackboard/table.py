import json, html

from . import pgtypes


class TableView:
    def render_head(self):
        return ('<link href="static/table.css" rel="stylesheet" />'
                '<script src="static/table.js"></script>')

    def render_body_start(self):
        return ''

    def render_exception(self, exception):
        return '<p class="message-error message">{0}</p>'.format(exception)

    def render_nonquery(self, result):
        return '<p class="message">{0}</p>'.format(result)

    def render_notice(self, notice):
        return self.render_nonquery(notice)

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
                'data-database': self._database,
                'class': 'rowset' + (
                    ' rowset-has-blankrow' if self._can_insert else ''
                )
            })



            yield tagopen('thead')
            yield tagopen('tr')
            yield tag('th', '', { 'class': 'rowset-rowheader' })
            for alias, name, typid, iskey in self._columns:
                yield tagopen('th', {
                    'data-name': name,
                    'data-key': iskey or None,
                    'class': 'rowset-colheader'
                })
                yield tag('div', alias)
                yield tag('small', pgtypes.get_type_name(typid), {
                    'class': 'rowset-coltype'
                })
                yield tagclose('th')
            yield tagclose('tr')
            yield tagclose('thead')

            yield tagopen('tbody')

        def render_outro(self):
            if self._can_insert:
                yield tagopen('tr')
                yield tag('th', '') # rownum
                editable_td = tag('td', '')
                yield editable_td * len(self._columns)
                yield tagclose('tr')
            yield tagclose('tbody')
            yield tagclose('table')

        def render_rows(self, rows):
            for row in rows:
                yield '<tr>'
                yield '<th></th>' #rownum
                for val, render in zip(row, self._colrenderers):
                    yield '<td class="emptystr">' if val == '' else '<td>'
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
            yield '"'
            yield html.escape(str(attval))
            yield '"'
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


