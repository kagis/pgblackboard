import json


class MapView:

    def render_head(self):
        return (
            '<link href="static/lib/leaflet/0.7.3/leaflet.css" rel="stylesheet" type="text/css" />'
            '<link href="static/map.css" rel="stylesheet" />'
            '<script>L_PREFER_CANVAS = true;</script>'
            '<script src="static/lib/leaflet/0.7.3/leaflet.js"></script>')

    def render_body_start(self):
        return '<script src="static/map.js"></script>'

    def render_exception(self, exception):
        return '<script>console.error({0!r})</script>'.format(
            str(exception)
        )

    def render_nonquery(self, result):
        return '<script>console.log({0!r})</script>'.format(
            str(result)
        )

    def render_notice(self, notice):
        return self.render_nonquery(notice)

    class get_rowset_renderer:
        def __init__(self, columns, table, schema, database):
            self._columns = columns
            colnames = [name for name, *_ in columns]
            if 'st_asgeojson' in colnames:
                self._geomcol_ix = geomcol_ix = colnames.index('st_asgeojson')
                if columns[geomcol_ix][1] == 114: # json type
                    self.get_geojson_from_row = lambda x: x
                else:
                    self.get_geojson = lambda x: x and json.loads(x)

                self._propnames = colnames[:geomcol_ix] + colnames[geomcol_ix+1:]
            else:
                self.render_intro = \
                self.render_outro = lambda *_, **__: []
                self.render_rows = lambda *_, **__: []


        def render_intro(self):
            yield '<script>beginFeatureCollection();</script>'

        def render_outro(self):
            return []

        def render_rows(self, rows):
            yield '<script>addFeatures('
            yield json.dumps({
                'type': 'FeatureCollection',
                'features': [{
                    'type': 'Feature',
                    'geometry': self._get_geom_from_row(row),
                    'properties': self._get_props_from_row(row)
                } for row in rows]
            }, ensure_ascii=False, default=str)
            yield ');</script>'

        def _get_geom_from_row(self, row):
            return self.get_geojson(row[self._geomcol_ix])

        def _get_props_from_row(self, row):
            return dict(zip(
                self._propnames,
                (x for i, x in enumerate(row)
                    if i != self._geomcol_ix)
            ))