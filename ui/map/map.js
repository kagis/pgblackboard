import '../_lib/maplibre.js';
import ne_cities from './ne_cities.js';
import ne_land from './ne_land.js';
import glyphs from './glyphs.js';

const { Map: MaplibreMap, LngLatBounds, MercatorCoordinate } = globalThis.maplibregl;

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
    'sat': {
      type: 'raster',
      tileSize: 256,
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
    },
    'ne_land': { // TODO land -> coastlines
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
      },
      metadata: {
        alt_paint: {
          'fill-color': 'hsl(0, 0%, 98%)',
        },
      },
    },
    // {
    //   id: 'sat',
    //   type: 'raster',
    //   source: 'sat',
    //   paint: {
    //     'raster-opacity': .5,
    //   },
    // },
    {
      id: 'out_fill',
      type: 'fill',
      source: 'features',
      filter: ['==', ['geometry-type'], 'Polygon'],
      paint: {
        'fill-opacity': .4,
        'fill-color': ['to-color', ['concat', 'hsl(', ['get', 'hue'], ', 100%, 70%)']],
      },
    },
    {
      id: 'hl_fill',
      type: 'fill',
      source: 'highlight',
      filter: ['==', ['geometry-type'], 'Polygon'],
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
      filter: ['==', ['geometry-type'], 'LineString'],
      paint: {
        'line-width': 2,
        'line-color': ['to-color', ['concat', 'hsl(', ['get', 'hue'], ', 90%, 50%)']],
      },
    },
    {
      id: 'hl_path',
      type: 'line',
      source: 'highlight',
      filter: ['!=', ['geometry-type'], 'Point'],
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
      filter: ['!=', ['geometry-type'], 'Point'],
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
      id: 'out_collapsed',
      type: 'circle',
      source: 'features',
      filter: [
        'all',
        ['==', ['geometry-type'], 'Point'],
        ['<=', ['zoom'], ['get', 'zmin']],
      ],
      paint: {
        'circle-radius': 2 ,
        'circle-color': ['to-color', ['concat', 'hsla(', ['get', 'hue'], ', 90%, 70%, .6)']],
        // 'circle-stroke-width': 1,
        // 'circle-stroke-color': ['to-color', ['concat', 'hsl(', ['get', 'hue'], ', 100%, 70%)']],
      },
      metadata: {
        alt_paint: {
          'circle-color': ['to-color', ['concat', 'hsla(', ['get', 'hue'], ', 100%, 50%, .6)']],
          // 'circle-stroke-color': ['to-color', ['concat', 'hsl(', ['get', 'hue'], ', 100%, 30%)']],
        },
      },
    },
    {
      id: 'out_point',
      type: 'circle',
      source: 'features',
      filter: [
        'all',
        ['==', ['geometry-type'], 'Point'],
        ['==', null, ['get', 'zmin']],
      ],
      paint: {
        'circle-radius': 2,
        'circle-color': ['to-color', ['concat', 'hsla(', ['get', 'hue'], ', 90%, 50%, .6)']],
        'circle-stroke-width': 1,
        'circle-stroke-color': ['to-color', ['concat', 'hsl(', ['get', 'hue'], ', 100%, 70%)']],
      },
      metadata: {
        alt_paint: {
          'circle-color': ['to-color', ['concat', 'hsla(', ['get', 'hue'], ', 100%, 50%, .6)']],
          'circle-stroke-color': ['to-color', ['concat', 'hsl(', ['get', 'hue'], ', 100%, 30%)']],
        },
      },
    },
    {
      id: 'hl_point',
      type: 'circle',
      source: 'highlight',
      filter: [
        'all',
        ['==', ['geometry-type'], 'Point'],
        ['<=', ['zoom'], ['coalesce', ['get', 'zmin'], 100]],
      ],
      paint: {
        'circle-radius': 2,
        'circle-color':  'hsl(0, 0%, 90%)',
        'circle-stroke-width': 2,
        'circle-stroke-color': 'hsl(0, 0%, 90%)',

        // 'circle-color': 'transparent',
        // 'circle-color': ['to-color', ['concat', 'hsla(', ['get', 'hue'], ', 90%, 50%, .6)']],
        // 'circle-stroke-width': 1,
        // 'circle-stroke-color': 'hsl(0, 0%, 90%)',
      },
      metadata: {
        alt_paint: {
          'circle-stroke-color': 'hsl(0, 0%, 30%)',
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
        'text-opacity': .4, // allows features to be visible through city labels
      },
      layout: {
        'text-size': 14,
        'text-field': ['get', 'name'],
        'text-padding': 8,
        'symbol-sort-key': ['get', 'weight'],
        'text-anchor': 'bottom', // prevent features from being overlapped by city labels
      },
      metadata: {
        alt_paint: {
          'text-color': 'hsl(0, 0%, 30%)',
          'text-halo-color': 'hsl(0, 0%, 100%)',
        },
      },
    },
    // {
    //   id: 'hl_point',
    //   type: 'symbol',
    //   filter: ['==', ['geometry-type'], 'Point'],
    //   source: 'highlight',
    //   paint: {
    //     // 'icon-color': '#fff',
    //     // 'icon-halo-color': 'red',
    //     // 'icon-halo-width': 2,
    //   },
    //   layout: {
    //     // 'icon-image': 'drop_marker',
    //     'icon-image': 'drop_white',
    //     'icon-anchor': 'bottom',
    //     'icon-allow-overlap': true,
    //   },
    //   metadata: {
    //     alt_layout: {
    //       'icon-image': 'drop_black',
    //     },
    //   },
    // },
  ],
};

// const drop_white = /*xml*/ `
//   <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
//     <path fill="#f0f0f0" stroke="#f0f0f0" fill-opacity="0.8" stroke-width="1.5" d="M4.11619 13.9087L4.11618 13.9087C3.71889 12.9491 3.5 11.9 3.5 10.8C3.5 6.22655 7.29492 2.5 12 2.5C16.7051 2.5 20.5 6.22654 20.5 10.8C20.5 11.9 20.2811 12.9491 19.8838 13.9087C19.5776 14.6484 18.9254 15.6255 18.0848 16.6992C17.2516 17.7634 16.2603 18.889 15.3054 19.9196C14.3514 20.9493 13.4382 21.8796 12.7632 22.5526C12.4511 22.8639 12.1901 23.1199 12 23.3049C11.8099 23.1199 11.5489 22.8639 11.2368 22.5526C10.5618 21.8796 9.64859 20.9493 8.69455 19.9196C7.73971 18.889 6.74839 17.7634 5.91519 16.6992C5.07457 15.6255 4.42238 14.6484 4.11619 13.9087ZM12 14.5C13.933 14.5 15.5 12.933 15.5 11C15.5 9.067 13.933 7.5 12 7.5C10.067 7.5 8.5 9.067 8.5 11C8.5 12.933 10.067 14.5 12 14.5Z" />
//   </svg>
// `;

// const drop_black = /*xml*/ `
//   <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
//     <path fill="#555" stroke="#555" fill-opacity="0.8" stroke-width="1.5" d="M4.11619 13.9087L4.11618 13.9087C3.71889 12.9491 3.5 11.9 3.5 10.8C3.5 6.22655 7.29492 2.5 12 2.5C16.7051 2.5 20.5 6.22654 20.5 10.8C20.5 11.9 20.2811 12.9491 19.8838 13.9087C19.5776 14.6484 18.9254 15.6255 18.0848 16.6992C17.2516 17.7634 16.2603 18.889 15.3054 19.9196C14.3514 20.9493 13.4382 21.8796 12.7632 22.5526C12.4511 22.8639 12.1901 23.1199 12 23.3049C11.8099 23.1199 11.5489 22.8639 11.2368 22.5526C10.5618 21.8796 9.64859 20.9493 8.69455 19.9196C7.73971 18.889 6.74839 17.7634 5.91519 16.6992C5.07457 15.6255 4.42238 14.6484 4.11619 13.9087ZM12 14.5C13.933 14.5 15.5 12.933 15.5 11C15.5 9.067 13.933 7.5 12 7.5C10.067 7.5 8.5 9.067 8.5 11C8.5 12.933 10.067 14.5 12 14.5Z" />
//   </svg>
// `;

export default {
  computed: {
    curr_frame_idx: vm => vm.$store.out.curr_frame_idx,
    curr_row_idx: vm => vm.$store.out.curr_row_idx,
    frames: vm => vm.$store.out.frames,
    features: vm => vm._compute_features(),
  },
  methods: {
    _render() {
      return { tag: 'div', class: 'map' };
    },
    _mounted() {
      this._ml = globalThis.debug_map = new MaplibreMap({
        style,
        container: this.$el,
        attributionControl: false, // TODO ?
      });

      // this.add_svg_image('drop_white', drop_white);
      // this.add_svg_image('drop_black', drop_black);
      // this.add_svg_image('drop_marker', drop_marker, true);

      // TODO immediate?
      this.$watch(_ => this.$store.light_theme, this.set_theme);
      this.$watch(_ => this.features, this.watch_features);
      this.$watch(this._compute_highlighted_features, this.watch_highlight);

      this.$root.$el.addEventListener('req_map_navigate', this.on_req_map_navigate);
      this._ml.on('click', this.on_map_click);
    },
    _unmounted() {
      this._ml.remove();
    },

    _compute_features() {
      const golden_angle = 137.5077640500378546463487; // https://en.wikipedia.org/wiki/Golden_angle
      const granularity = 4 /*marker diameter px*/ / 512 /*world size px*/;
      const features = [];
      for (let frame_idx = 0; frame_idx < this.frames.length; frame_idx++) {
        const { rows, geom_col_idx } = this.frames[frame_idx];
        if (geom_col_idx < 0 || !rows) continue;
        // TODO fix bad contrast when blue on black bg
        const hue = (200 + frame_idx * golden_angle) % 360;
        for (let row_idx = 0; row_idx < rows.length; row_idx++) {
          const { tuple } = rows[row_idx];
          const geometry = geojson_try_parse(tuple[geom_col_idx]);
          if (!geometry) continue;
          const bbox = [180, 90, -180, -90];
          for (const singular_geom of geojson_unnest(geometry)) {
            const [w, s, e, n] = geojson_bbox(singular_geom);
            geojson_extend_bbox(bbox, w, s);
            geojson_extend_bbox(bbox, e, n);
            if (singular_geom.type == 'Point') continue; // TODO multipoint
            const lb = MercatorCoordinate.fromLngLat([w, s]);
            const rt = MercatorCoordinate.fromLngLat([e, n]);
            const span = Math.hypot(rt.x - lb.x, rt.y - lb.y);
            const zmin = Math.log2(granularity / span);
            const coordinates = [(w + e) / 2, (s + n) / 2];
            features.push({
              type: 'Feature',
              properties: { frame_idx, row_idx, hue, zmin },
              geometry: { type: 'Point', coordinates },
            });
          }
          features.push({
            type: 'Feature',
            properties: { frame_idx, row_idx, hue, zmin: null },
            geometry,
            bbox,
          });
        }
      }
      return features;
    },

    _compute_highlighted_features() {
      return this.features.filter(({ properties: p }) => (
        p.frame_idx == this.curr_frame_idx &&
        p.row_idx == this.curr_row_idx
      ));
    },

    // add_svg_image(id, svg, sdf) {
    //   this._ml.addImage(id, { data: [0, 0, 0, 0], width: 1, height: 1 });
    //   const img = new Image();
    //   img.src = 'data:image/svg+xml,' + encodeURIComponent(svg);
    //   img.onload = _ => {
    //     img.width *= 2;
    //     img.height *= 2;
    //     this._ml.removeImage(id);
    //     this._ml.addImage(id, img, { pixelRatio: 2, sdf });
    //   };
    // },

    set_theme(light) {
      for (const { id, paint = 0, layout = 0, metadata = 0 } of style.layers) {
        const { alt_paint = 0, alt_layout = 0 } = metadata;
        const curr_paint = light ? alt_paint : paint;
        for (const p in alt_paint) this._ml.setPaintProperty(id, p, curr_paint[p]);
        // TODO rm alt_layout
        const curr_layout = light ? alt_layout : layout;
        for (const p in alt_layout) this._ml.setLayoutProperty(id, p, curr_layout[p]);
      }
    },
    watch_features(features) {
      this._ml.getSource('features').setData({
        type: 'FeatureCollection',
        features,
      });
    },
    watch_highlight(features) {
      this._ml.getSource('highlight').setData({
        type: 'FeatureCollection',
        features,
      });
    },
    on_map_click({ point }) {
      const pad = { x: 2, y: 2 };
      const qbox = [point.sub(pad), point.add(pad)];
      const feature = (
        // TODO exclude already highlighted feature
        this._ml.queryRenderedFeatures(qbox, { layers: ['out_point', 'out_collapsed', 'out_line'] })[0] ||
        this._ml.queryRenderedFeatures(point, { layers: ['out_fill'] })[0]
      );
      if (!feature) return; // TODO clear highlight
      const { frame_idx, row_idx } = feature.properties;
      const detail = { frame_idx, row_idx };
      this.$root.$el.dispatchEvent(new CustomEvent('req_row_focus', { detail }));
      this.$store.set_curr_rowcol(frame_idx, row_idx);
      // TODO zoom to feature extent
    },
    on_req_map_navigate({ detail: { frame_idx, row_idx } }) {
      // const geom = this.get_row_geom(frame_idx, row_idx);
      const feature = this.features.find(({ properties: p }) => (
        p.zmin == null &&
        p.frame_idx == frame_idx &&
        p.row_idx == row_idx
      ));
      if (!feature) return;
      const padding = 20; // px
      const { width, height } = this._ml.transform;
      const sw = this._ml.unproject([padding, height - padding]);
      const ne = this._ml.unproject([width - padding, padding]);
      const bounds = new LngLatBounds(sw, ne);
      bounds.extend(feature.bbox);
      this._ml.fitBounds(bounds, { padding });
      // TODO if point then use box of the point and nearest point from dataset
      // this._ml.fitBounds(geom.bbox, { padding: 20 });
    },
  },
};

function geojson_try_parse(maybe_geojson) {
  try {
    return JSON.parse(maybe_geojson);
  } catch {
    return null;
  }
}

function geojson_unnest(geom) {
  switch (geom.type) {
    case 'MultiLineString':
      return geom.coordinates.map(coordinates => ({ type: 'LineString', coordinates }));
    case 'MultiPolygon':
      return geom.coordinates.map(coordinates => ({ type: 'Polygon', coordinates }));
    case 'GeometryCollection':
      return geom.geometries.flatMap(geojson_unnest);
    default:
      return [geom];
  }
}

function geojson_bbox({ type, coordinates }) {
  switch (type) {
    case 'Point':
      return [...coordinates, ...coordinates]; // TODO slice(0, 2)
    case 'Polygon':
      [coordinates] = coordinates; // take exterior ring only
    case 'MultiPoint':
    case 'LineString': {
      const bbox = [180, 90, -180, -90];
      for (const p of coordinates) {
        // [lng, lat] = p // 3x slower
        geojson_extend_bbox(bbox, p[0], p[1]);
      }
      return bbox;
    }
    default:
      throw Error('impossible');
  }
}

function geojson_extend_bbox(bbox, lng, lat) {
  // TODO world wrap
  bbox[0] = Math.min(bbox[0], lng);
  bbox[1] = Math.min(bbox[1], lat);
  bbox[2] = Math.max(bbox[2], lng);
  bbox[3] = Math.max(bbox[3], lat);
}
