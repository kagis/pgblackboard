import '../_lib/maplibre.js';
import ne_cities from './ne_cities.js';
import ne_land from './ne_land.js';
import glyphs from './glyphs.js';

const { Map: MaplibreMap, LngLatBounds } = globalThis.maplibregl;

// TODO show circle marker on subpixel polygons

const ne_land_blob = new Blob([JSON.stringify(ne_land)]);
const ne_cities_blob = new Blob([JSON.stringify(ne_cities)]);
const glyphs_blob = await fetch(glyphs).then(x => x.blob());

const style = {
  version: 8,
  glyphs: URL.createObjectURL(glyphs_blob) + '#/{fontstack}/{range}',
  // glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  transition: {
    duration: 0, // instant theme switch
  },
  sources: {
    'ne_land': {
      type: 'geojson',
      data: URL.createObjectURL(ne_land_blob),
      tolerance: .2,
    },
    'ne_cities': {
      type: 'geojson',
      data: URL.createObjectURL(ne_cities_blob),
    },
    'highlight': {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      tolerance: 0, // show all vertices
    },
    'features': {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      tolerance: .2,
    },
  },
  layers: [
    {
      id: 'land',
      type: 'fill',
      source: 'ne_land',
      paint: {
        'fill-color': 'hsl(0, 0%, 20%)',
        // 'fill-opacity': .2,
      },
      metadata: {
        alt_paint: {
          'fill-color': 'hsl(0, 0%, 98%)',
        },
      },
    },
    {
      id: 'out_fill',
      type: 'fill',
      source: 'features',
      filter: ['in', '$type', 'Polygon'],
      paint: {
        'fill-opacity': .4,
        'fill-color': ['to-color', ['concat', 'hsl(', ['get', 'hue'], ', 90%, 50%)']],
      },
    },
    {
      id: 'hl_fill',
      type: 'fill',
      source: 'highlight',
      filter: ['in', '$type', 'Polygon'],
      paint: {
        'fill-color': '#eee',
        'fill-opacity': .2,
      },
      metadata: {
        alt_paint: {
          'fill-color': '#555',
          // 'fill-color': 'hsl(0, 100%, 50%)',
        },
      },
    },
    {
      id: 'out_line',
      type: 'line',
      source: 'features',
      filter: ['in', '$type', 'LineString'],
      paint: {
        'line-width': 2,
        'line-color': ['to-color', ['concat', 'hsl(', ['get', 'hue'], ', 90%, 50%)']],
      },
    },
    {
      id: 'hl_path',
      type: 'line',
      source: 'highlight',
      filter: ['in', '$type', 'LineString', 'Polygon'],
      paint: {
        'line-width': 1,
        'line-color': '#eee',
      },
      metadata: {
        alt_paint: {
          'line-color': '#555',
          // 'line-color': 'hsl(0, 100%, 50%)',
        },
      },
    },
    {
      id: 'hl_vertex',
      type: 'circle',
      source: 'highlight',
      filter: ['in', '$type', 'Polygon', 'LineString'],
      paint: {
        'circle-radius': 2,
        'circle-color': '#eee',
      },
      metadata: {
        alt_paint: {
          'circle-color': '#555',
          // 'circle-color': 'hsl(0, 100%, 50%)',
        },
      },
    },
    {
      id: 'out_point',
      type: 'circle',
      source: 'features',
      filter: ['in', '$type', 'Point'],
      paint: {
        'circle-radius': 2,
        'circle-color': ['to-color', ['concat', 'hsla(', ['get', 'hue'], ', 90%, 50%, .6)']],
        // 'circle-opacity': .75,
        'circle-stroke-width': 1,
        // 'circle-stroke-color': '#fff',
        'circle-stroke-color': ['to-color', ['concat', 'hsl(', ['get', 'hue'], ', 100%, 70%)']],
        // 'circle-stroke-opacity': .5,
      },
      metadata: {
        alt_paint: {
          // 'circle-stroke-color': '#333',
          'circle-color': ['to-color', ['concat', 'hsla(', ['get', 'hue'], ', 100%, 50%, .6)']],
          'circle-stroke-color': ['to-color', ['concat', 'hsl(', ['get', 'hue'], ', 100%, 30%)']],
        },
      },
    },
    {
      id: 'ne_cities',
      type: 'symbol',
      source: 'ne_cities',
      paint: {
        'text-color': 'hsl(0, 0%, 90%)',
        'text-halo-color': 'hsl(0, 0%, 0%)',
        'text-halo-width': 1,
        'text-opacity': .8, // prevent points overlap
      },
      layout: {
        'text-size': 14,
        'text-field': ['get', 'name'],
        'text-padding': 8,
        'symbol-sort-key': ['get', 'weight'],
      },
      metadata: {
        alt_paint: {
          'text-color': 'hsl(0, 0%, 30%)',
          'text-halo-color': 'hsl(0, 0%, 100%)',
        },
      },
    },
    {
      id: 'hl_point',
      type: 'symbol',
      filter: ['in', '$type', 'Point'],
      source: 'highlight',
      paint: {
        // 'icon-color': '#fff',
        // 'icon-halo-color': 'red',
        // 'icon-halo-width': 2,
      },
      layout: {
        // 'icon-image': 'drop_marker',
        'icon-image': 'drop_white',
        'icon-anchor': 'bottom',
        'icon-allow-overlap': true,
      },
      metadata: {
        alt_layout: {
          'icon-image': 'drop_black',
        },
      },
    },
  ],
};

const drop_white = /*xml*/ `
  <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path fill="#f0f0f0" stroke="#f0f0f0" fill-opacity="0.8" stroke-width="1.5" d="M4.11619 13.9087L4.11618 13.9087C3.71889 12.9491 3.5 11.9 3.5 10.8C3.5 6.22655 7.29492 2.5 12 2.5C16.7051 2.5 20.5 6.22654 20.5 10.8C20.5 11.9 20.2811 12.9491 19.8838 13.9087C19.5776 14.6484 18.9254 15.6255 18.0848 16.6992C17.2516 17.7634 16.2603 18.889 15.3054 19.9196C14.3514 20.9493 13.4382 21.8796 12.7632 22.5526C12.4511 22.8639 12.1901 23.1199 12 23.3049C11.8099 23.1199 11.5489 22.8639 11.2368 22.5526C10.5618 21.8796 9.64859 20.9493 8.69455 19.9196C7.73971 18.889 6.74839 17.7634 5.91519 16.6992C5.07457 15.6255 4.42238 14.6484 4.11619 13.9087ZM12 14.5C13.933 14.5 15.5 12.933 15.5 11C15.5 9.067 13.933 7.5 12 7.5C10.067 7.5 8.5 9.067 8.5 11C8.5 12.933 10.067 14.5 12 14.5Z" />
  </svg>
`;

const drop_black = /*xml*/ `
  <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path fill="#555" stroke="#555" fill-opacity="0.8" stroke-width="1.5" d="M4.11619 13.9087L4.11618 13.9087C3.71889 12.9491 3.5 11.9 3.5 10.8C3.5 6.22655 7.29492 2.5 12 2.5C16.7051 2.5 20.5 6.22654 20.5 10.8C20.5 11.9 20.2811 12.9491 19.8838 13.9087C19.5776 14.6484 18.9254 15.6255 18.0848 16.6992C17.2516 17.7634 16.2603 18.889 15.3054 19.9196C14.3514 20.9493 13.4382 21.8796 12.7632 22.5526C12.4511 22.8639 12.1901 23.1199 12 23.3049C11.8099 23.1199 11.5489 22.8639 11.2368 22.5526C10.5618 21.8796 9.64859 20.9493 8.69455 19.9196C7.73971 18.889 6.74839 17.7634 5.91519 16.6992C5.07457 15.6255 4.42238 14.6484 4.11619 13.9087ZM12 14.5C13.933 14.5 15.5 12.933 15.5 11C15.5 9.067 13.933 7.5 12 7.5C10.067 7.5 8.5 9.067 8.5 11C8.5 12.933 10.067 14.5 12 14.5Z" />
  </svg>
`;

// const drop_marker = /*xml*/ `
//   <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
//     <path d="M3.65244 14.0641C3.23178 13.0493 3 11.94 3 10.7768C3 5.94062 7.01815 2 12 2C16.9819 2 21 5.9406 21 10.7768C21 11.94 20.7682 13.0493 20.3476 14.0641C20.0233 14.8462 19.3328 15.8795 18.4427 17.0148C17.5605 18.1402 16.5109 19.3304 15.4998 20.4202C14.4897 21.5091 13.5228 22.4928 12.8081 23.2045C12.4776 23.5337 12.2013 23.8044 12 24C11.7987 23.8044 11.5224 23.5337 11.1919 23.2045C10.4772 22.4928 9.51027 21.5091 8.50011 20.4202C7.4891 19.3304 6.43947 18.1402 5.55726 17.0148C4.66719 15.8795 3.97664 14.8462 3.65244 14.0641ZM12 14.6893C14.0467 14.6893 15.7059 13.0323 15.7059 10.9883C15.7059 8.94423 14.0467 7.28722 12 7.28722C9.95329 7.28722 8.29412 8.94423 8.29412 10.9883C8.29412 13.0323 9.95329 14.6893 12 14.6893Z" fill="black"/>
//   </svg>
// `;

export default {
  template: /*html*/ `<div class="map"></div>`,
  computed: {
    curr_frame_idx: vm => vm.$store.out.curr_frame_idx,
    curr_row_idx: vm => vm.$store.out.curr_row_idx,
    frames: vm => vm.$store.out.frames,
  },
  methods: {
    _mounted() {
      this._ml = window.debug_map = new MaplibreMap({
        style,
        container: this.$el,
        attributionControl: false, // TODO ?
      });

      this.add_svg_image('drop_white', drop_white);
      this.add_svg_image('drop_black', drop_black);
      // this.add_svg_image('drop_marker', drop_marker, true);

      // TODO immediate?
      this.$watch(_ => this.$store.light_theme, this.set_theme);
      this.$watch(_ => this.get_all_geojson(), this.update_features_source);
      this.$watch(_ => this.get_highlight_geojson(), this.update_highlight_source);

      this.$root.$el.addEventListener('req_map_navigate', this.on_req_map_navigate);
      this._ml.on('click', this.on_map_click);
    },
    _unmounted() {
      this._ml.remove();
    },

    get_highlight_geojson() {
      const empty = { type: 'FeatureCollection', features: [] };
      return (
        this.curr_frame_idx != null &&
        this.curr_row_idx != null &&
        this.get_row_geom(this.curr_frame_idx, this.curr_row_idx) ||
        empty
      );
    },

    get_all_geojson() {
      const features = this.frames.flatMap(({ rows, geom_col_idx }, frame_idx) => {
        if (geom_col_idx < 0 || !rows) return [];
        // TODO no increment frame_idx if not geom col
        const hue = (200 + frame_idx * 40) % 360; // TODO constrast
        return rows.map((row, row_idx) => ({
          type: 'Feature',
          properties: { frame_idx, row_idx, hue },
          geometry: try_parse_geojson(row.tuple[geom_col_idx]),
        }));
      });
      return { type: 'FeatureCollection', features };
    },

    get_row_geom(frame_idx, row_idx) {
      const { rows, geom_col_idx } = this.frames[frame_idx];
      return try_parse_geojson(rows[row_idx].tuple[geom_col_idx]);
    },

    add_svg_image(id, svg, sdf) {
      this._ml.addImage(id, { data: [0, 0, 0, 0], width: 1, height: 1 });
      const img = new Image();
      img.src = 'data:image/svg+xml,' + encodeURIComponent(svg);
      img.onload = _ => {
        img.width *= 2;
        img.height *= 2;
        this._ml.removeImage(id);
        this._ml.addImage(id, img, { pixelRatio: 2, sdf });
      };
    },
    set_theme(light) {
      for (const { id, paint = 0, layout = 0, metadata = 0 } of style.layers) {
        const { alt_paint = 0, alt_layout = 0 } = metadata;
        const curr_paint = light ? alt_paint : paint;
        for (const p in alt_paint) this._ml.setPaintProperty(id, p, curr_paint[p]);
        const curr_layout = light ? alt_layout : layout;
        for (const p in alt_layout) this._ml.setLayoutProperty(id, p, curr_layout[p]);
      }
    },
    update_features_source(value) {
      this._ml.getSource('features').setData(value);
    },
    update_highlight_source(value) {
      this._ml.getSource('highlight').setData(value);
    },
    on_map_click({ point }) {
      const pad = { x: 2, y: 2 };
      const qbox = [point.sub(pad), point.add(pad)];
      const feature = (
        // TODO exclude already highlighted feature
        this._ml.queryRenderedFeatures(qbox, { layers: ['out_point', 'out_line'] })[0] ||
        this._ml.queryRenderedFeatures(point, { layers: ['out_fill'] })[0]
      );
      if (!feature) return;
      const { frame_idx, row_idx } = feature.properties;
      const detail = { frame_idx, row_idx };
      this.$root.$el.dispatchEvent(new CustomEvent('req_row_focus', { detail }));
      this.$store.set_curr_rowcol(frame_idx, row_idx);
      // TODO zoom to feature extent
    },
    on_req_map_navigate({ detail: { frame_idx, row_idx } }) {
      const geom = this.get_row_geom(frame_idx, row_idx);
      if (!geom) return;
      const padding = 20; // px
      const { width, height } = this._ml.transform;
      const sw = this._ml.unproject([padding, height - padding]);
      const ne = this._ml.unproject([width - padding, padding]);
      const bounds = new LngLatBounds(sw, ne);
      bounds.extend(geom.bbox);
      this._ml.fitBounds(bounds, { padding });
      // TODO if point then use box of the point and nearest point from dataset
      // this._ml.fitBounds(geom.bbox, { padding: 20 });
    },
  },
  mounted() {
    return this._mounted();
  },
  unmounted() { // beforeUnmount?
    return this._unmounted();
  },
};

function try_parse_geojson(inp) {
  let geom = null;
  try { geom = JSON.parse(inp); } catch {}
  if (geom != null) {
    // TODO validate
    geom.bbox = geojson_bbox(geom);
  }
  return geom;
}

function geojson_bbox({ type, coordinates }) {
  const initial = new LngLatBounds();
  switch (type) {
    case 'Point':
      return initial.extend(coordinates);
    case 'MultiPoint':
    case 'LineString':
      return coordinates.reduce((bbox, p) => bbox.extend(p), initial);
    case 'Polygon':
      return geojson_bbox({ type: 'LineString', coordinates: coordinates[0] });
    case 'MultiLineString':
      return coordinates.reduce(
        (bbox, coordinates) => bbox.extend(geojson_bbox({ type: 'LineString', coordinates })),
        initial,
      );
    case 'MultiPolygon':
      return coordinates.reduce(
        (bbox, coordinates) => bbox.extend(geojson_bbox({ type: 'Polygon', coordinates })),
        initial,
      );
  }
}
