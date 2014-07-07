import json


class RegularView:
    def render_head(self):
        return '<link href="assets/table/table.css" rel="stylesheet" />'

    def render_body_start(self):
        return ''

    def render_exception(self, exception):
        return '<pre class="error">{0}</pre>'.format(exception)

    def render_nonquery(self, result):
        return '<p class="non-query-result">{0}</p>'.format(result)

    class get_rowset_renderer:
        def __init__(self, colnames, coltypes):
            self._colnames = colnames
            self._colisnum = [
                typ in (20, 21, 23, 26, 700, 701, 790, 1700, 11499)
                for typ in coltypes
            ]
            self._colrenderers = [
                render_json if typ == 114 else str
                for typ in coltypes
            ]

        def render_intro(self):
            yield ('<table onclick="event.target.classList.toggle(\'expanded\')">'
                   '<tr>'
                   '<th>#</ht>')
            for name in self._colnames:
                yield '<th>'
                yield name
                yield '</th>'
            yield '</tr>'

        def render_outro(self):
            yield '</table>'

        def render_rows(self, rows, offset):
            for i, row in enumerate(rows, 1):
                yield '<tr>'
                yield '<td>'
                yield str(i + offset)
                yield '</td>'
                for val, isnum, render in zip(row,
                                              self._colisnum,
                                              self._colrenderers):
                    yield '<td'
                    if isnum:
                        yield ' class="num"'
                    yield '>'
                    yield '<em>null</em>' if val is None else render(val)
                    yield '</td>'
                yield '</tr>'

def render_json(obj):
    return json.dumps(obj, ensure_ascii=False, indent=2, default=str)
