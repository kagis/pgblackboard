import json

import shapely.wkb


class MapView:

    def render_head(self):
        return (
            '<link href="//cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.3/leaflet.css" rel="stylesheet" type="text/css" />'
            '<script>L_PREFER_CANVAS = true;</script>'
            '<script src="//cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.3/leaflet.js"></script>'
            '<link href="assets/map/map.css" rel="stylesheet" />')

    def render_body_start(self):
        return ('<div id="map"></div>'
                '<script src="assets/map/map.js"></script>')

    def render_exception(self, exception):
        return '<script>console.error({0!r})</script>'.format(
            str(exception)
        )

    def render_nonquery(self, result):
        return '<script>console.log({0!r})</script>'.format(
            str(result)
        )

    class get_rowset_renderer:
        def __init__(self, colnames, coltypes):
            self.colnames = colnames
            self.coltypes = coltypes
            if 'geom' in colnames:
                self._geomcol_ix = geomcol_ix = colnames.index('geom')
                self._propnames = colnames[:geomcol_ix] + colnames[geomcol_ix+1:]
            else:
                self.render_intro = \
                self.render_outro = lambda: []
                self.render_rows = lambda _, __: []


        def render_intro(self):
            yield '<script>beginFeatureCollection();</script>'

        def render_outro(self):
            return []

        def render_rows(self, rows, offset):
            yield '<script>addFeatures('
            yield json.dumps({
                'type': 'FeatureCollection',
                'features': [{
                    'type': 'Feature',
                    'geometry': hex_ewkb_mapping(row[self._geomcol_ix]),
                    'properties': dict(zip(
                        self._propnames,
                        (x for i, x in enumerate(row)
                            if i != self._geomcol_ix)
                    ))
                } for row in rows]
            }, ensure_ascii=False, default=str)
            yield ');</script>'


def hex_ewkb_mapping(hex_ewkb):
    if hex_ewkb:
        return shapely.wkb.loads(hex_ewkb, hex=True).__geo_interface__
