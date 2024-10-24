import dispatch from '../../core/dispatch.js';
import bus from '../../core/bus.js';

import './mapboxgl/mapbox-gl.js';
// const mapbox


const feature_colors = [
  // '#ff7f00',
  // '#1f78b4',
  // '#e31a1c',
  // '#33a02c',
  // '#fb9a99',
  // '#fdbf6f',
  // '#b2df8a',
  // '#a6cee3',

  '#b15928',
  '#ffff99',
  '#6a3d9a',
  '#cab2d6',
  '#ff7f00',
  '#fdbf6f',
  '#e31a1c',
  '#fb9a99',
  '#33a02c',
  '#b2df8a',
  '#1f78b4',
  '#a6cee3',
];


export default render_map;

function render_map(params) {
  return node => create_or_update_map(node, params);
}

function create_or_update_map(node, params) {
  if (node && node.map) {
    return void node.map.update(params);
  }
  return {
    tag: 'div',
    attrs: { class: 'map_container' },
    events: {
      $created({ target, virtualNode }) {
        const map = new Map(target);
        map.update(params);
        virtualNode.map = map;
        window.map = map;
      },
      $destroyed({ virtualNode: { map } }) {
        map.destroy();
      },
    },
  };
}

class Map {
  constructor(container_el) {
    this.mapboxgl_map = new mapboxgl.Map({
      container: container_el,
      // style: 'https://openmaptiles.github.io/positron-gl-style/style-cdn.json',
      zoom: 1,
      center: [20 /* push antarctida down */, 0],
      attributionControl: false,
    });

    this._handle_row_focus = this._handle_row_focus.bind(this);
    this._invalidate_size = this._invalidate_size.bind(this);
    this.mapboxgl_map.on('click', this._handle_map_click.bind(this));

    bus.on('rendered:ROW_FOCUS', this._handle_row_focus);
    bus.on('rendered:MAP_TOGGLE', this._invalidate_size);
    bus.on('rendered:SPLIT_OUTPUT', this._invalidate_size);
    bus.on('rendered:SPLIT_HORIZONTAL', this._invalidate_size);
    bus.on('rendered:SPLIT_VERTICAL', this._invalidate_size);
  }
  destroy() {
    bus.off('rendered:ROW_FOCUS', this._handle_row_focus);
    bus.off('rendered:MAP_TOGGLE', this._invalidate_size);
    bus.off('rendered:SPLIT_OUTPUT', this._invalidate_size);
    bus.off('rendered:SPLIT_HORIZONTAL', this._invalidate_size);
    bus.off('rendered:SPLIT_VERTICAL', this._invalidate_size);
  }
  _invalidate_size() {
    this.mapboxgl_map.resize();
  }
  _handle_row_focus({ stmt_index, row_index, shouldnot_map_move }, state) {
    const stmt_result = state.stmt_results[stmt_index];
    const row = stmt_result.rows[row_index];
    const geom = row[stmt_result.geom_field_idx];
    if (!geom) {
      return;
    }
    const geojson = JSON.parse(geom);
    const bbox = geojson_bbox(geojson);
    if (!shouldnot_map_move) {
      this.mapboxgl_map.fitBounds(bbox, { maxZoom: 15 });
    }
  }
  _handle_map_click({ point }) {
    const [feature] = this.mapboxgl_map.queryRenderedFeatures(point, {
      layers: this.layers_ids,
    });
    if (!feature) {
      return;
    }
    const { stmt_index, row_index } = feature.properties;
    dispatch({
      type: 'ROW_FOCUS',
      stmt_index,
      row_index,
      shouldnot_map_move: true,
    });
  }
  update(params) {
    this.layers_ids = [
      ...params.stmt_results.map((_, stmt_index) => `pgblackboard:${stmt_index}_point`),
      ...params.stmt_results.map((_, stmt_index) => `pgblackboard:${stmt_index}_line`),
      ...params.stmt_results.map((_, stmt_index) => `pgblackboard:${stmt_index}_polygon`),
    ];
    this.mapboxgl_map.setStyle(mapbox_style(params));
  }
}

function geojson_bbox({ type, coordinates }) {
  switch (type) {
    case 'Point':
      return new mapboxgl.LngLatBounds(coordinates, coordinates);
    case 'MultiPoint':
    case 'LineString':
      return coordinates.reduce(
        (bbox, vertex) => bbox.extend(vertex),
        new mapboxgl.LngLatBounds(
          coordinates[0],
          coordinates[0]
        )
      );
    case 'MultiLineString':
      return coordinates.reduce(
        (bbox, coordinates) => bbox.extend(geojson_bbox({
          type: 'LineString',
          coordinates,
        })),
        new mapboxgl.LngLatBounds(
          coordinates[0][0],
          coordinates[0][0]
        )
      );
    case 'Polygon':
      return geojson_bbox({
        type: 'LineString',
        coordinates: coordinates[0],
      });
    case 'MultiPolygon':
      return coordinates.reduce(
        (bbox, coordinates) => bbox.extend(geojson_bbox({
          type: 'Polygon',
          coordinates,
        })),
        new mapboxgl.LngLatBounds(
          coordinates[0][0][0],
          coordinates[0][0][0]
        )
      );
  }
}

function mapbox_style({
  map: { show_sat },
  stmt_results,
  focused_row,
  is_dark,
}) {
  const result = is_dark ? mapstyle_dark() : mapstyle_light();


  Object.assign(result.sources, ...stmt_results.map(({ geom_field_idx, rows }, stmt_index) => ({
    [`pgblackboard:${stmt_index}`]: {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: typeof geom_field_idx != 'number' ? [] : rows.map((row, row_index) => ({
          type: 'Feature',
          geometry: JSON.parse(row[geom_field_idx]),
          properties: {
            row_index,
            stmt_index,
          },
        })),
      },
    },
  })));


  result.layers = [
    ...result.layers,
    ...stmt_results.map(({ show_layer }, idx) => ({
      'id': `pgblackboard:${idx}_polygon`,
      'type': 'fill',
      'source': `pgblackboard:${idx}`,
      'layout': {
        'visibility': show_layer ? 'visible' : 'none',
      },
      'paint': {
        'fill-color': feature_colors[idx],
        'fill-opacity': 0.4,
      },
      'filter': ['==', '$type', 'Polygon'],
    })),
    ...focused_row && [{
      'id': 'pgblackboard:focused_line',
      'type': 'line',
      'source': `pgblackboard:${focused_row.stmt_index}`,
      'filter': [
        'all',
        ['==', 'row_index', focused_row.row_index],
        ['in', '$type', 'Polygon', 'LineString'],
      ],
      'paint': {
        'line-width': 3,
        'line-color': 'red',
      },
    }] || [],
    ...stmt_results.map(({ show_layer }, idx) => ({
      'id': `pgblackboard:${idx}_line`,
      'type': 'line',
      'source': `pgblackboard:${idx}`,
      'layout': {
        'visibility': show_layer ? 'visible' : 'none',
      },
      'paint': {
        'line-color': feature_colors[idx],
        'line-width': 2,
      },
      'filter': ['==', '$type', 'LineString'],
    })),
    ...stmt_results.map(({ show_layer }, idx) => ({
      'id': `pgblackboard:${idx}_point`,
      'type': 'circle',
      'source': `pgblackboard:${idx}`,
      'layout': {
        'visibility': show_layer ? 'visible' : 'none',
      },
      'paint': {
          'circle-radius': 5,
          'circle-color': feature_colors[idx],
      },
      'filter': ["==", "$type", "Point"]
    })),
    ...focused_row && [{
      'id': 'pgblackboard:focused_point',
      'type': 'circle',
      'source': `pgblackboard:${focused_row.stmt_index}`,
      'filter': [
        'all',
        ['==', 'row_index', focused_row.row_index],
        ['==', '$type', 'Point'],
      ],
      'paint': {
        'circle-radius': 3,
        'circle-opacity': 0,
        'circle-stroke-width': 2,
        'circle-stroke-color': 'red',
      },
    }] || [],

  ];

  if (show_sat) {
    result.layers.find(({ id }) => id == 'pgblackboard-sat').layout.visibility = 'visible';
  }

  return result;
}


const mapstyle_light = () => ({
  "version": 8,
  "name": "Positron",
  "metadata": {
    "mapbox:autocomposite": false,
    "mapbox:type": "template",
    "mapbox:groups": {
      "b6371a3f2f5a9932464fa3867530a2e5": {
        "name": "Transportation",
        "collapsed": false
      },
      "a14c9607bc7954ba1df7205bf660433f": {
        "name": "Boundaries"
      },
      "101da9f13b64a08fa4b6ac1168e89e5f": {
        "name": "Places",
        "collapsed": false
      }
    },
    "openmaptiles:version": "3.x",
    "openmaptiles:mapbox:owner": "openmaptiles",
    "openmaptiles:mapbox:source:url": "mapbox://openmaptiles.4qljc88t"
  },
  "center": [
    10.184401828277089,
    -1.1368683772161603e-13
  ],
  "zoom": 0.8902641636539237,
  "bearing": 0,
  "pitch": 0,
  "sources": {
    "openmaptiles": {
      "type": "vector",
      "url": "https://free.tilehosting.com/data/v3.json?key=hWWfWrAiWGtv68r8wA6D"
    },
    "bing-imagery": {
      "type": "raster",
      "tileSize": 256,
      "tiles": [
        "http://ecn.t2.tiles.virtualearth.net/tiles/a{quadkey}.jpeg?g=414"
      ]
    }
  },
  "sprite": "https://openmaptiles.github.io/positron-gl-style/sprite",
  "glyphs": "https://free.tilehosting.com/fonts/{fontstack}/{range}.pbf?key=hWWfWrAiWGtv68r8wA6D",
  "layers": [
    {
      "id": "background",
      "type": "background",
      "paint": {
        "background-color": "rgb(242,243,240)"
      }
    },
    {
      "id": "park",
      "type": "fill",
      "source": "openmaptiles",
      "source-layer": "park",
      "filter": [
        "==",
        "$type",
        "Polygon"
      ],
      "layout": {
        "visibility": "visible"
      },
      "paint": {
        "fill-color": "rgb(230, 233, 229)"
      }
    },
    {
      "id": "water",
      "type": "fill",
      "source": "openmaptiles",
      "source-layer": "water",
      "filter": [
        "==",
        "$type",
        "Polygon"
      ],
      "layout": {
        "visibility": "visible"
      },
      "paint": {
        "fill-color": "rgb(194, 200, 202)",
        "fill-antialias": true
      }
    },
    {
      "id": "landcover_ice_shelf",
      "type": "fill",
      "source": "openmaptiles",
      "source-layer": "landcover",
      "maxzoom": 8,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "Polygon"
        ],
        [
          "==",
          "subclass",
          "ice_shelf"
        ]
      ],
      "layout": {
        "visibility": "visible"
      },
      "paint": {
        "fill-color": "hsl(0, 0%, 98%)",
        "fill-opacity": 0.7
      }
    },
    {
      "id": "landcover_glacier",
      "type": "fill",
      "source": "openmaptiles",
      "source-layer": "landcover",
      "maxzoom": 8,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "Polygon"
        ],
        [
          "==",
          "subclass",
          "glacier"
        ]
      ],
      "layout": {
        "visibility": "visible"
      },
      "paint": {
        "fill-color": "hsl(0, 0%, 98%)",
        "fill-opacity": {
          "base": 1,
          "stops": [
            [
              0,
              1
            ],
            [
              8,
              0.5
            ]
          ]
        }
      }
    },
    {
      "id": "landuse_residential",
      "type": "fill",
      "source": "openmaptiles",
      "source-layer": "landuse",
      "maxzoom": 16,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "Polygon"
        ],
        [
          "==",
          "class",
          "residential"
        ]
      ],
      "layout": {
        "visibility": "visible"
      },
      "paint": {
        "fill-color": "rgb(234, 234, 230)",
        "fill-opacity": {
          "base": 0.6,
          "stops": [
            [
              8,
              0.8
            ],
            [
              9,
              0.6
            ]
          ]
        }
      }
    },
    {
      "id": "landcover_wood",
      "type": "fill",
      "source": "openmaptiles",
      "source-layer": "landcover",
      "minzoom": 10,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "Polygon"
        ],
        [
          "==",
          "class",
          "wood"
        ]
      ],
      "layout": {
        "visibility": "visible"
      },
      "paint": {
        "fill-color": "rgb(220,224,220)",
        "fill-opacity": {
          "base": 1,
          "stops": [
            [
              8,
              0
            ],
            [
              12,
              1
            ]
          ]
        }
      }
    },
    {
      "id": "pgblackboard-sat",
      "type": "raster",
      "source": "bing-imagery",
      "layout": {
        "visibility":"none"
      }
    },
    {
      "id": "waterway",
      "type": "line",
      "source": "openmaptiles",
      "source-layer": "waterway",
      "filter": [
        "==",
        "$type",
        "LineString"
      ],
      "layout": {
        "visibility": "visible"
      },
      "paint": {
        "line-color": "hsl(195, 17%, 78%)"
      }
    },
    {
      "id": "water_name",
      "type": "symbol",
      "source": "openmaptiles",
      "source-layer": "water_name",
      "filter": [
        "all",
        [
          "==",
          "$type",
          "LineString"
        ],
        [
          "!has",
          "name:en"
        ]
      ],
      "layout": {
        "text-field": "{name:latin} {name:nonlatin}",
        "symbol-placement": "line",
        "text-rotation-alignment": "map",
        "symbol-spacing": 500,
        "text-font": [
          "Metropolis Medium Italic",
          "Klokantech Noto Sans Italic",
          "Klokantech Noto Sans CJK Regular"
        ],
        "text-size": 12
      },
      "paint": {
        "text-color": "rgb(157,169,177)",
        "text-halo-color": "rgb(242,243,240)",
        "text-halo-width": 1,
        "text-halo-blur": 1
      }
    },
    {
      "id": "water_name-en",
      "type": "symbol",
      "source": "openmaptiles",
      "source-layer": "water_name",
      "filter": [
        "all",
        [
          "==",
          "$type",
          "LineString"
        ],
        [
          "has",
          "name:en"
        ]
      ],
      "layout": {
        "text-field": "{name:en} {name:nonlatin}",
        "symbol-placement": "line",
        "text-rotation-alignment": "map",
        "symbol-spacing": 500,
        "text-font": [
          "Metropolis Medium Italic",
          "Klokantech Noto Sans Italic",
          "Klokantech Noto Sans CJK Regular"
        ],
        "text-size": 12
      },
      "paint": {
        "text-color": "rgb(157,169,177)",
        "text-halo-color": "rgb(242,243,240)",
        "text-halo-width": 1,
        "text-halo-blur": 1
      }
    },
    {
      "id": "building",
      "type": "fill",
      "source": "openmaptiles",
      "source-layer": "building",
      "minzoom": 12,
      "paint": {
        "fill-color": "rgb(234, 234, 229)",
        "fill-outline-color": "rgb(219, 219, 218)",
        "fill-antialias": true
      }
    },
    {
      "id": "tunnel_motorway_casing",
      "type": "line",
      "metadata": {
        "mapbox:group": "b6371a3f2f5a9932464fa3867530a2e5"
      },
      "source": "openmaptiles",
      "source-layer": "transportation",
      "minzoom": 6,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "LineString"
        ],
        [
          "all",
          [
            "==",
            "brunnel",
            "tunnel"
          ],
          [
            "==",
            "class",
            "motorway"
          ]
        ]
      ],
      "layout": {
        "line-cap": "butt",
        "line-join": "miter",
        "visibility": "visible"
      },
      "paint": {
        "line-color": "rgb(213, 213, 213)",
        "line-width": {
          "base": 1.4,
          "stops": [
            [
              5.8,
              0
            ],
            [
              6,
              3
            ],
            [
              20,
              40
            ]
          ]
        },
        "line-opacity": 1
      }
    },
    {
      "id": "tunnel_motorway_inner",
      "type": "line",
      "metadata": {
        "mapbox:group": "b6371a3f2f5a9932464fa3867530a2e5"
      },
      "source": "openmaptiles",
      "source-layer": "transportation",
      "minzoom": 6,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "LineString"
        ],
        [
          "all",
          [
            "==",
            "brunnel",
            "tunnel"
          ],
          [
            "==",
            "class",
            "motorway"
          ]
        ]
      ],
      "layout": {
        "line-cap": "round",
        "line-join": "round",
        "visibility": "visible"
      },
      "paint": {
        "line-color": "rgb(234,234,234)",
        "line-width": {
          "base": 1.4,
          "stops": [
            [
              4,
              2
            ],
            [
              6,
              1.3
            ],
            [
              20,
              30
            ]
          ]
        }
      }
    },
    {
      "id": "aeroway-taxiway",
      "type": "line",
      "metadata": {
        "mapbox:group": "1444849345966.4436"
      },
      "source": "openmaptiles",
      "source-layer": "aeroway",
      "minzoom": 12,
      "filter": [
        "all",
        [
          "in",
          "class",
          "taxiway"
        ]
      ],
      "layout": {
        "line-cap": "round",
        "line-join": "round",
        "visibility": "visible"
      },
      "paint": {
        "line-color": "hsl(0, 0%, 88%)",
        "line-width": {
          "base": 1.55,
          "stops": [
            [
              13,
              1.8
            ],
            [
              20,
              20
            ]
          ]
        },
        "line-opacity": 1
      }
    },
    {
      "id": "aeroway-runway-casing",
      "type": "line",
      "metadata": {
        "mapbox:group": "1444849345966.4436"
      },
      "source": "openmaptiles",
      "source-layer": "aeroway",
      "minzoom": 11,
      "filter": [
        "all",
        [
          "in",
          "class",
          "runway"
        ]
      ],
      "layout": {
        "line-cap": "round",
        "line-join": "round",
        "visibility": "visible"
      },
      "paint": {
        "line-color": "hsl(0, 0%, 88%)",
        "line-width": {
          "base": 1.5,
          "stops": [
            [
              11,
              6
            ],
            [
              17,
              55
            ]
          ]
        },
        "line-opacity": 1
      }
    },
    {
      "id": "aeroway-area",
      "type": "fill",
      "metadata": {
        "mapbox:group": "1444849345966.4436"
      },
      "source": "openmaptiles",
      "source-layer": "aeroway",
      "minzoom": 4,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "Polygon"
        ],
        [
          "in",
          "class",
          "runway",
          "taxiway"
        ]
      ],
      "layout": {
        "visibility": "visible"
      },
      "paint": {
        "fill-opacity": {
          "base": 1,
          "stops": [
            [
              13,
              0
            ],
            [
              14,
              1
            ]
          ]
        },
        "fill-color": "rgba(255, 255, 255, 1)"
      }
    },
    {
      "id": "aeroway-runway",
      "type": "line",
      "metadata": {
        "mapbox:group": "1444849345966.4436"
      },
      "source": "openmaptiles",
      "source-layer": "aeroway",
      "minzoom": 11,
      "maxzoom": 24,
      "filter": [
        "all",
        [
          "in",
          "class",
          "runway"
        ],
        [
          "==",
          "$type",
          "LineString"
        ]
      ],
      "layout": {
        "line-cap": "round",
        "line-join": "round",
        "visibility": "visible"
      },
      "paint": {
        "line-color": "rgba(255, 255, 255, 1)",
        "line-width": {
          "base": 1.5,
          "stops": [
            [
              11,
              4
            ],
            [
              17,
              50
            ]
          ]
        },
        "line-opacity": 1
      }
    },
    {
      "id": "highway_path",
      "type": "line",
      "metadata": {
        "mapbox:group": "b6371a3f2f5a9932464fa3867530a2e5"
      },
      "source": "openmaptiles",
      "source-layer": "transportation",
      "filter": [
        "all",
        [
          "==",
          "$type",
          "LineString"
        ],
        [
          "==",
          "class",
          "path"
        ]
      ],
      "layout": {
        "line-cap": "round",
        "line-join": "round",
        "visibility": "visible"
      },
      "paint": {
        "line-color": "rgb(234, 234, 234)",
        "line-width": {
          "base": 1.2,
          "stops": [
            [
              13,
              1
            ],
            [
              20,
              10
            ]
          ]
        },
        "line-opacity": 0.9
      }
    },
    {
      "id": "highway_minor",
      "type": "line",
      "metadata": {
        "mapbox:group": "b6371a3f2f5a9932464fa3867530a2e5"
      },
      "source": "openmaptiles",
      "source-layer": "transportation",
      "minzoom": 8,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "LineString"
        ],
        [
          "in",
          "class",
          "minor",
          "service",
          "track"
        ]
      ],
      "layout": {
        "line-cap": "round",
        "line-join": "round",
        "visibility": "visible"
      },
      "paint": {
        "line-color": "hsl(0, 0%, 88%)",
        "line-width": {
          "base": 1.55,
          "stops": [
            [
              13,
              1.8
            ],
            [
              20,
              20
            ]
          ]
        },
        "line-opacity": 0.9
      }
    },
    {
      "id": "highway_major_casing",
      "type": "line",
      "metadata": {
        "mapbox:group": "b6371a3f2f5a9932464fa3867530a2e5"
      },
      "source": "openmaptiles",
      "source-layer": "transportation",
      "minzoom": 11,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "LineString"
        ],
        [
          "in",
          "class",
          "primary",
          "secondary",
          "tertiary",
          "trunk"
        ]
      ],
      "layout": {
        "line-cap": "butt",
        "line-join": "miter",
        "visibility": "visible"
      },
      "paint": {
        "line-color": "rgb(213, 213, 213)",
        "line-dasharray": [
          12,
          0
        ],
        "line-width": {
          "base": 1.3,
          "stops": [
            [
              10,
              3
            ],
            [
              20,
              23
            ]
          ]
        }
      }
    },
    {
      "id": "highway_major_inner",
      "type": "line",
      "metadata": {
        "mapbox:group": "b6371a3f2f5a9932464fa3867530a2e5"
      },
      "source": "openmaptiles",
      "source-layer": "transportation",
      "minzoom": 11,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "LineString"
        ],
        [
          "in",
          "class",
          "primary",
          "secondary",
          "tertiary",
          "trunk"
        ]
      ],
      "layout": {
        "line-cap": "round",
        "line-join": "round",
        "visibility": "visible"
      },
      "paint": {
        "line-color": "#fff",
        "line-width": {
          "base": 1.3,
          "stops": [
            [
              10,
              2
            ],
            [
              20,
              20
            ]
          ]
        }
      }
    },
    {
      "id": "highway_major_subtle",
      "type": "line",
      "metadata": {
        "mapbox:group": "b6371a3f2f5a9932464fa3867530a2e5"
      },
      "source": "openmaptiles",
      "source-layer": "transportation",
      "maxzoom": 11,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "LineString"
        ],
        [
          "in",
          "class",
          "primary",
          "secondary",
          "tertiary",
          "trunk"
        ]
      ],
      "layout": {
        "line-cap": "round",
        "line-join": "round",
        "visibility": "visible"
      },
      "paint": {
        "line-color": "hsla(0, 0%, 85%, 0.69)",
        "line-width": 2
      }
    },
    {
      "id": "highway_motorway_casing",
      "type": "line",
      "metadata": {
        "mapbox:group": "b6371a3f2f5a9932464fa3867530a2e5"
      },
      "source": "openmaptiles",
      "source-layer": "transportation",
      "minzoom": 6,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "LineString"
        ],
        [
          "all",
          [
            "!in",
            "brunnel",
            "bridge",
            "tunnel"
          ],
          [
            "==",
            "class",
            "motorway"
          ]
        ]
      ],
      "layout": {
        "line-cap": "butt",
        "line-join": "miter",
        "visibility": "visible"
      },
      "paint": {
        "line-color": "rgb(213, 213, 213)",
        "line-width": {
          "base": 1.4,
          "stops": [
            [
              5.8,
              0
            ],
            [
              6,
              3
            ],
            [
              20,
              40
            ]
          ]
        },
        "line-dasharray": [
          2,
          0
        ],
        "line-opacity": 1
      }
    },
    {
      "id": "highway_motorway_inner",
      "type": "line",
      "metadata": {
        "mapbox:group": "b6371a3f2f5a9932464fa3867530a2e5"
      },
      "source": "openmaptiles",
      "source-layer": "transportation",
      "minzoom": 6,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "LineString"
        ],
        [
          "all",
          [
            "!in",
            "brunnel",
            "bridge",
            "tunnel"
          ],
          [
            "==",
            "class",
            "motorway"
          ]
        ]
      ],
      "layout": {
        "line-cap": "round",
        "line-join": "round",
        "visibility": "visible"
      },
      "paint": {
        "line-color": {
          "base": 1,
          "stops": [
            [
              5.8,
              "hsla(0, 0%, 85%, 0.53)"
            ],
            [
              6,
              "#fff"
            ]
          ]
        },
        "line-width": {
          "base": 1.4,
          "stops": [
            [
              4,
              2
            ],
            [
              6,
              1.3
            ],
            [
              20,
              30
            ]
          ]
        }
      }
    },
    {
      "id": "highway_motorway_subtle",
      "type": "line",
      "metadata": {
        "mapbox:group": "b6371a3f2f5a9932464fa3867530a2e5"
      },
      "source": "openmaptiles",
      "source-layer": "transportation",
      "maxzoom": 6,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "LineString"
        ],
        [
          "==",
          "class",
          "motorway"
        ]
      ],
      "layout": {
        "line-cap": "round",
        "line-join": "round",
        "visibility": "visible"
      },
      "paint": {
        "line-color": "hsla(0, 0%, 85%, 0.53)",
        "line-width": {
          "base": 1.4,
          "stops": [
            [
              4,
              2
            ],
            [
              6,
              1.3
            ]
          ]
        }
      }
    },
    {
      "id": "railway_transit",
      "type": "line",
      "metadata": {
        "mapbox:group": "b6371a3f2f5a9932464fa3867530a2e5"
      },
      "source": "openmaptiles",
      "source-layer": "transportation",
      "minzoom": 16,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "LineString"
        ],
        [
          "all",
          [
            "==",
            "class",
            "transit"
          ],
          [
            "!in",
            "brunnel",
            "tunnel"
          ]
        ]
      ],
      "layout": {
        "visibility": "visible",
        "line-join": "round"
      },
      "paint": {
        "line-color": "#dddddd",
        "line-width": 3
      }
    },
    {
      "id": "railway_transit_dashline",
      "type": "line",
      "metadata": {
        "mapbox:group": "b6371a3f2f5a9932464fa3867530a2e5"
      },
      "source": "openmaptiles",
      "source-layer": "transportation",
      "minzoom": 16,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "LineString"
        ],
        [
          "all",
          [
            "==",
            "class",
            "transit"
          ],
          [
            "!in",
            "brunnel",
            "tunnel"
          ]
        ]
      ],
      "layout": {
        "visibility": "visible",
        "line-join": "round"
      },
      "paint": {
        "line-color": "#fafafa",
        "line-width": 2,
        "line-dasharray": [
          3,
          3
        ]
      }
    },
    {
      "id": "railway_service",
      "type": "line",
      "metadata": {
        "mapbox:group": "b6371a3f2f5a9932464fa3867530a2e5"
      },
      "source": "openmaptiles",
      "source-layer": "transportation",
      "minzoom": 16,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "LineString"
        ],
        [
          "all",
          [
            "==",
            "class",
            "rail"
          ],
          [
            "has",
            "service"
          ]
        ]
      ],
      "layout": {
        "visibility": "visible",
        "line-join": "round"
      },
      "paint": {
        "line-color": "#dddddd",
        "line-width": 3
      }
    },
    {
      "id": "railway_service_dashline",
      "type": "line",
      "metadata": {
        "mapbox:group": "b6371a3f2f5a9932464fa3867530a2e5"
      },
      "source": "openmaptiles",
      "source-layer": "transportation",
      "minzoom": 16,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "LineString"
        ],
        [
          "==",
          "class",
          "rail"
        ],
        [
          "has",
          "service"
        ]
      ],
      "layout": {
        "visibility": "visible",
        "line-join": "round"
      },
      "paint": {
        "line-color": "#fafafa",
        "line-width": 2,
        "line-dasharray": [
          3,
          3
        ]
      }
    },
    {
      "id": "railway",
      "type": "line",
      "metadata": {
        "mapbox:group": "b6371a3f2f5a9932464fa3867530a2e5"
      },
      "source": "openmaptiles",
      "source-layer": "transportation",
      "minzoom": 13,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "LineString"
        ],
        [
          "all",
          [
            "!has",
            "service"
          ],
          [
            "==",
            "class",
            "rail"
          ]
        ]
      ],
      "layout": {
        "visibility": "visible",
        "line-join": "round"
      },
      "paint": {
        "line-color": "#dddddd",
        "line-width": {
          "base": 1.3,
          "stops": [
            [
              16,
              3
            ],
            [
              20,
              7
            ]
          ]
        }
      }
    },
    {
      "id": "railway_dashline",
      "type": "line",
      "metadata": {
        "mapbox:group": "b6371a3f2f5a9932464fa3867530a2e5"
      },
      "source": "openmaptiles",
      "source-layer": "transportation",
      "minzoom": 13,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "LineString"
        ],
        [
          "all",
          [
            "!has",
            "service"
          ],
          [
            "==",
            "class",
            "rail"
          ]
        ]
      ],
      "layout": {
        "visibility": "visible",
        "line-join": "round"
      },
      "paint": {
        "line-color": "#fafafa",
        "line-width": {
          "base": 1.3,
          "stops": [
            [
              16,
              2
            ],
            [
              20,
              6
            ]
          ]
        },
        "line-dasharray": [
          3,
          3
        ]
      }
    },
    {
      "id": "highway_motorway_bridge_casing",
      "type": "line",
      "metadata": {
        "mapbox:group": "b6371a3f2f5a9932464fa3867530a2e5"
      },
      "source": "openmaptiles",
      "source-layer": "transportation",
      "minzoom": 6,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "LineString"
        ],
        [
          "all",
          [
            "==",
            "brunnel",
            "bridge"
          ],
          [
            "==",
            "class",
            "motorway"
          ]
        ]
      ],
      "layout": {
        "line-cap": "butt",
        "line-join": "miter",
        "visibility": "visible"
      },
      "paint": {
        "line-color": "rgb(213, 213, 213)",
        "line-width": {
          "base": 1.4,
          "stops": [
            [
              5.8,
              0
            ],
            [
              6,
              5
            ],
            [
              20,
              45
            ]
          ]
        },
        "line-dasharray": [
          2,
          0
        ],
        "line-opacity": 1
      }
    },
    {
      "id": "highway_motorway_bridge_inner",
      "type": "line",
      "metadata": {
        "mapbox:group": "b6371a3f2f5a9932464fa3867530a2e5"
      },
      "source": "openmaptiles",
      "source-layer": "transportation",
      "minzoom": 6,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "LineString"
        ],
        [
          "all",
          [
            "==",
            "brunnel",
            "bridge"
          ],
          [
            "==",
            "class",
            "motorway"
          ]
        ]
      ],
      "layout": {
        "line-cap": "round",
        "line-join": "round",
        "visibility": "visible"
      },
      "paint": {
        "line-color": {
          "base": 1,
          "stops": [
            [
              5.8,
              "hsla(0, 0%, 85%, 0.53)"
            ],
            [
              6,
              "#fff"
            ]
          ]
        },
        "line-width": {
          "base": 1.4,
          "stops": [
            [
              4,
              2
            ],
            [
              6,
              1.3
            ],
            [
              20,
              30
            ]
          ]
        }
      }
    },
    {
      "id": "highway_name_other",
      "type": "symbol",
      "metadata": {
        "mapbox:group": "b6371a3f2f5a9932464fa3867530a2e5"
      },
      "source": "openmaptiles",
      "source-layer": "transportation_name",
      "filter": [
        "all",
        [
          "!=",
          "class",
          "motorway"
        ],
        [
          "==",
          "$type",
          "LineString"
        ],
        [
          "!has",
          "name:en"
        ]
      ],
      "layout": {
        "text-size": 10,
        "text-max-angle": 30,
        "text-transform": "uppercase",
        "symbol-spacing": 350,
        "text-font": [
          "Metropolis Regular",
          "Klokantech Noto Sans Regular",
          "Klokantech Noto Sans CJK Regular"
        ],
        "symbol-placement": "line",
        "visibility": "visible",
        "text-rotation-alignment": "map",
        "text-pitch-alignment": "viewport",
        "text-field": "{name:latin} {name:nonlatin}"
      },
      "paint": {
        "text-color": "#bbb",
        "text-halo-color": "#fff",
        "text-translate": [
          0,
          0
        ],
        "text-halo-width": 2,
        "text-halo-blur": 1
      }
    },
    {
      "id": "highway_name_other-en",
      "type": "symbol",
      "metadata": {
        "mapbox:group": "b6371a3f2f5a9932464fa3867530a2e5"
      },
      "source": "openmaptiles",
      "source-layer": "transportation_name",
      "filter": [
        "all",
        [
          "!=",
          "class",
          "motorway"
        ],
        [
          "==",
          "$type",
          "LineString"
        ],
        [
          "has",
          "name:en"
        ]
      ],
      "layout": {
        "text-size": 10,
        "text-max-angle": 30,
        "text-transform": "uppercase",
        "symbol-spacing": 350,
        "text-font": [
          "Metropolis Regular",
          "Klokantech Noto Sans Regular",
          "Klokantech Noto Sans CJK Regular"
        ],
        "symbol-placement": "line",
        "visibility": "visible",
        "text-rotation-alignment": "map",
        "text-pitch-alignment": "viewport",
        "text-field": "{name:en} {name:nonlatin}"
      },
      "paint": {
        "text-color": "#bbb",
        "text-halo-color": "#fff",
        "text-translate": [
          0,
          0
        ],
        "text-halo-width": 2,
        "text-halo-blur": 1
      }
    },
    {
      "id": "highway_name_motorway",
      "type": "symbol",
      "metadata": {
        "mapbox:group": "b6371a3f2f5a9932464fa3867530a2e5"
      },
      "source": "openmaptiles",
      "source-layer": "transportation_name",
      "filter": [
        "all",
        [
          "==",
          "$type",
          "LineString"
        ],
        [
          "==",
          "class",
          "motorway"
        ]
      ],
      "layout": {
        "text-size": 10,
        "symbol-spacing": 350,
        "text-font": [
          "Metropolis Light",
          "Klokantech Noto Sans Regular",
          "Klokantech Noto Sans CJK Regular"
        ],
        "symbol-placement": "line",
        "visibility": "visible",
        "text-rotation-alignment": "viewport",
        "text-pitch-alignment": "viewport",
        "text-field": "{ref}"
      },
      "paint": {
        "text-color": "rgb(117, 129, 145)",
        "text-halo-color": "hsl(0, 0%, 100%)",
        "text-translate": [
          0,
          2
        ],
        "text-halo-width": 1,
        "text-halo-blur": 1
      }
    },
    {
      "id": "boundary_state",
      "type": "line",
      "metadata": {
        "mapbox:group": "a14c9607bc7954ba1df7205bf660433f"
      },
      "source": "openmaptiles",
      "source-layer": "boundary",
      "filter": [
        "==",
        "admin_level",
        4
      ],
      "layout": {
        "line-cap": "round",
        "line-join": "round",
        "visibility": "visible"
      },
      "paint": {
        "line-color": "rgb(230, 204, 207)",
        "line-width": {
          "base": 1.3,
          "stops": [
            [
              3,
              1
            ],
            [
              22,
              15
            ]
          ]
        },
        "line-blur": 0.4,
        "line-dasharray": [
          2,
          2
        ],
        "line-opacity": 1
      }
    },
    {
      "id": "boundary_country",
      "type": "line",
      "metadata": {
        "mapbox:group": "a14c9607bc7954ba1df7205bf660433f"
      },
      "source": "openmaptiles",
      "source-layer": "boundary",
      "filter": [
        "==",
        "admin_level",
        2
      ],
      "layout": {
        "line-cap": "round",
        "line-join": "round"
      },
      "paint": {
        "line-color": "rgb(230, 204, 207)",
        "line-width": {
          "base": 1.1,
          "stops": [
            [
              3,
              1
            ],
            [
              22,
              20
            ]
          ]
        },
        "line-blur": {
          "base": 1,
          "stops": [
            [
              0,
              0.4
            ],
            [
              22,
              4
            ]
          ]
        },
        "line-opacity": 1
      }
    },
    {
      "id": "place_other",
      "type": "symbol",
      "metadata": {
        "mapbox:group": "101da9f13b64a08fa4b6ac1168e89e5f"
      },
      "source": "openmaptiles",
      "source-layer": "place",
      "maxzoom": 14,
      "filter": [
        "all",
        [
          "!in",
          "class",
          "city",
          "suburb",
          "town",
          "village"
        ],
        [
          "==",
          "$type",
          "Point"
        ],
        [
          "!has",
          "name:en"
        ]
      ],
      "layout": {
        "text-size": 10,
        "text-transform": "uppercase",
        "text-font": [
          "Metropolis Regular",
          "Klokantech Noto Sans Regular",
          "Klokantech Noto Sans CJK Regular"
        ],
        "text-justify": "center",
        "visibility": "visible",
        "text-offset": [
          0.5,
          0
        ],
        "text-anchor": "center",
        "text-field": "{name:latin}\n{name:nonlatin}"
      },
      "paint": {
        "text-color": "rgb(117, 129, 145)",
        "text-halo-color": "rgb(242,243,240)",
        "text-halo-width": 1,
        "text-halo-blur": 1
      }
    },
    {
      "id": "place_other-en",
      "type": "symbol",
      "metadata": {
        "mapbox:group": "101da9f13b64a08fa4b6ac1168e89e5f"
      },
      "source": "openmaptiles",
      "source-layer": "place",
      "maxzoom": 14,
      "filter": [
        "all",
        [
          "!in",
          "class",
          "city",
          "suburb",
          "town",
          "village"
        ],
        [
          "==",
          "$type",
          "Point"
        ],
        [
          "has",
          "name:en"
        ]
      ],
      "layout": {
        "text-size": 10,
        "text-transform": "uppercase",
        "text-font": [
          "Metropolis Regular",
          "Klokantech Noto Sans Regular",
          "Klokantech Noto Sans CJK Regular"
        ],
        "text-justify": "center",
        "visibility": "visible",
        "text-offset": [
          0.5,
          0
        ],
        "text-anchor": "center",
        "text-field": "{name:en}\n{name:nonlatin}"
      },
      "paint": {
        "text-color": "rgb(117, 129, 145)",
        "text-halo-color": "rgb(242,243,240)",
        "text-halo-width": 1,
        "text-halo-blur": 1
      }
    },
    {
      "id": "place_suburb",
      "type": "symbol",
      "metadata": {
        "mapbox:group": "101da9f13b64a08fa4b6ac1168e89e5f"
      },
      "source": "openmaptiles",
      "source-layer": "place",
      "maxzoom": 15,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "Point"
        ],
        [
          "==",
          "class",
          "suburb"
        ],
        [
          "!has",
          "name:en"
        ]
      ],
      "layout": {
        "text-size": 10,
        "text-transform": "uppercase",
        "text-font": [
          "Metropolis Regular",
          "Klokantech Noto Sans Regular",
          "Klokantech Noto Sans CJK Regular"
        ],
        "text-justify": "center",
        "visibility": "visible",
        "text-offset": [
          0.5,
          0
        ],
        "text-anchor": "center",
        "text-field": "{name:latin}\n{name:nonlatin}"
      },
      "paint": {
        "text-color": "rgb(117, 129, 145)",
        "text-halo-color": "rgb(242,243,240)",
        "text-halo-width": 1,
        "text-halo-blur": 1
      }
    },
    {
      "id": "place_suburb-en",
      "type": "symbol",
      "metadata": {
        "mapbox:group": "101da9f13b64a08fa4b6ac1168e89e5f"
      },
      "source": "openmaptiles",
      "source-layer": "place",
      "maxzoom": 15,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "Point"
        ],
        [
          "==",
          "class",
          "suburb"
        ],
        [
          "has",
          "name:en"
        ]
      ],
      "layout": {
        "text-size": 10,
        "text-transform": "uppercase",
        "text-font": [
          "Metropolis Regular",
          "Klokantech Noto Sans Regular",
          "Klokantech Noto Sans CJK Regular"
        ],
        "text-justify": "center",
        "visibility": "visible",
        "text-offset": [
          0.5,
          0
        ],
        "text-anchor": "center",
        "text-field": "{name:en}\n{name:nonlatin}"
      },
      "paint": {
        "text-color": "rgb(117, 129, 145)",
        "text-halo-color": "rgb(242,243,240)",
        "text-halo-width": 1,
        "text-halo-blur": 1
      }
    },
    {
      "id": "place_village",
      "type": "symbol",
      "metadata": {
        "mapbox:group": "101da9f13b64a08fa4b6ac1168e89e5f"
      },
      "source": "openmaptiles",
      "source-layer": "place",
      "maxzoom": 14,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "Point"
        ],
        [
          "==",
          "class",
          "village"
        ],
        [
          "!has",
          "name:en"
        ]
      ],
      "layout": {
        "text-size": 10,
        "text-transform": "uppercase",
        "text-font": [
          "Metropolis Regular",
          "Klokantech Noto Sans Regular",
          "Klokantech Noto Sans CJK Regular"
        ],
        "text-justify": "left",
        "visibility": "visible",
        "text-offset": [
          0.5,
          0.2
        ],
        "icon-size": 0.4,
        "text-anchor": "left",
        "text-field": "{name:latin}\n{name:nonlatin}"
      },
      "paint": {
        "text-color": "rgb(117, 129, 145)",
        "text-halo-color": "rgb(242,243,240)",
        "text-halo-width": 1,
        "text-halo-blur": 1,
        "icon-opacity": 0.7
      }
    },
    {
      "id": "place_village-en",
      "type": "symbol",
      "metadata": {
        "mapbox:group": "101da9f13b64a08fa4b6ac1168e89e5f"
      },
      "source": "openmaptiles",
      "source-layer": "place",
      "maxzoom": 14,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "Point"
        ],
        [
          "==",
          "class",
          "village"
        ],
        [
          "has",
          "name:en"
        ]
      ],
      "layout": {
        "text-size": 10,
        "text-transform": "uppercase",
        "text-font": [
          "Metropolis Regular",
          "Klokantech Noto Sans Regular",
          "Klokantech Noto Sans CJK Regular"
        ],
        "text-justify": "left",
        "visibility": "visible",
        "text-offset": [
          0.5,
          0.2
        ],
        "icon-size": 0.4,
        "text-anchor": "left",
        "text-field": "{name:en}\n{name:nonlatin}"
      },
      "paint": {
        "text-color": "rgb(117, 129, 145)",
        "text-halo-color": "rgb(242,243,240)",
        "text-halo-width": 1,
        "text-halo-blur": 1,
        "icon-opacity": 0.7
      }
    },
    {
      "id": "place_town",
      "type": "symbol",
      "metadata": {
        "mapbox:group": "101da9f13b64a08fa4b6ac1168e89e5f"
      },
      "source": "openmaptiles",
      "source-layer": "place",
      "maxzoom": 15,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "Point"
        ],
        [
          "==",
          "class",
          "town"
        ],
        [
          "!has",
          "name:en"
        ]
      ],
      "layout": {
        "text-size": 10,
        "icon-image": {
          "base": 1,
          "stops": [
            [
              0,
              "circle-11"
            ],
            [
              8,
              ""
            ]
          ]
        },
        "text-transform": "uppercase",
        "text-font": [
          "Metropolis Regular",
          "Klokantech Noto Sans Regular",
          "Klokantech Noto Sans CJK Regular"
        ],
        "text-justify": "left",
        "visibility": "visible",
        "text-offset": [
          0.5,
          0.2
        ],
        "icon-size": 0.4,
        "text-anchor": {
          "base": 1,
          "stops": [
            [
              0,
              "left"
            ],
            [
              8,
              "center"
            ]
          ]
        },
        "text-field": "{name:latin}\n{name:nonlatin}"
      },
      "paint": {
        "text-color": "rgb(117, 129, 145)",
        "text-halo-color": "rgb(242,243,240)",
        "text-halo-width": 1,
        "text-halo-blur": 1,
        "icon-opacity": 0.7
      }
    },
    {
      "id": "place_town-en",
      "type": "symbol",
      "metadata": {
        "mapbox:group": "101da9f13b64a08fa4b6ac1168e89e5f"
      },
      "source": "openmaptiles",
      "source-layer": "place",
      "maxzoom": 15,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "Point"
        ],
        [
          "==",
          "class",
          "town"
        ],
        [
          "has",
          "name:en"
        ]
      ],
      "layout": {
        "text-size": 10,
        "icon-image": {
          "base": 1,
          "stops": [
            [
              0,
              "circle-11"
            ],
            [
              8,
              ""
            ]
          ]
        },
        "text-transform": "uppercase",
        "text-font": [
          "Metropolis Regular",
          "Klokantech Noto Sans Regular",
          "Klokantech Noto Sans CJK Regular"
        ],
        "text-justify": "left",
        "visibility": "visible",
        "text-offset": [
          0.5,
          0.2
        ],
        "icon-size": 0.4,
        "text-anchor": {
          "base": 1,
          "stops": [
            [
              0,
              "left"
            ],
            [
              8,
              "center"
            ]
          ]
        },
        "text-field": "{name:en}\n{name:nonlatin}"
      },
      "paint": {
        "text-color": "rgb(117, 129, 145)",
        "text-halo-color": "rgb(242,243,240)",
        "text-halo-width": 1,
        "text-halo-blur": 1,
        "icon-opacity": 0.7
      }
    },
    {
      "id": "place_city",
      "type": "symbol",
      "metadata": {
        "mapbox:group": "101da9f13b64a08fa4b6ac1168e89e5f"
      },
      "source": "openmaptiles",
      "source-layer": "place",
      "maxzoom": 14,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "Point"
        ],
        [
          "all",
          [
            "!=",
            "capital",
            2
          ],
          [
            "==",
            "class",
            "city"
          ],
          [
            ">",
            "rank",
            3
          ]
        ],
        [
          "!has",
          "name:en"
        ]
      ],
      "layout": {
        "text-size": 10,
        "icon-image": {
          "base": 1,
          "stops": [
            [
              0,
              "circle-11"
            ],
            [
              8,
              ""
            ]
          ]
        },
        "text-transform": "uppercase",
        "text-font": [
          "Metropolis Regular",
          "Klokantech Noto Sans Regular",
          "Klokantech Noto Sans CJK Regular"
        ],
        "text-justify": "left",
        "visibility": "visible",
        "text-offset": [
          0.5,
          0.2
        ],
        "icon-size": 0.4,
        "text-anchor": {
          "base": 1,
          "stops": [
            [
              0,
              "left"
            ],
            [
              8,
              "center"
            ]
          ]
        },
        "text-field": "{name:latin}\n{name:nonlatin}"
      },
      "paint": {
        "text-color": "rgb(117, 129, 145)",
        "text-halo-color": "rgb(242,243,240)",
        "text-halo-width": 1,
        "text-halo-blur": 1,
        "icon-opacity": 0.7
      }
    },
    {
      "id": "place_city-en",
      "type": "symbol",
      "metadata": {
        "mapbox:group": "101da9f13b64a08fa4b6ac1168e89e5f"
      },
      "source": "openmaptiles",
      "source-layer": "place",
      "maxzoom": 14,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "Point"
        ],
        [
          "all",
          [
            "!=",
            "capital",
            2
          ],
          [
            "==",
            "class",
            "city"
          ],
          [
            ">",
            "rank",
            3
          ]
        ],
        [
          "has",
          "name:en"
        ]
      ],
      "layout": {
        "text-size": 10,
        "icon-image": {
          "base": 1,
          "stops": [
            [
              0,
              "circle-11"
            ],
            [
              8,
              ""
            ]
          ]
        },
        "text-transform": "uppercase",
        "text-font": [
          "Metropolis Regular",
          "Klokantech Noto Sans Regular",
          "Klokantech Noto Sans CJK Regular"
        ],
        "text-justify": "left",
        "visibility": "visible",
        "text-offset": [
          0.5,
          0.2
        ],
        "icon-size": 0.4,
        "text-anchor": {
          "base": 1,
          "stops": [
            [
              0,
              "left"
            ],
            [
              8,
              "center"
            ]
          ]
        },
        "text-field": "{name:en}\n{name:nonlatin}"
      },
      "paint": {
        "text-color": "rgb(117, 129, 145)",
        "text-halo-color": "rgb(242,243,240)",
        "text-halo-width": 1,
        "text-halo-blur": 1,
        "icon-opacity": 0.7
      }
    },
    {
      "id": "place_capital",
      "type": "symbol",
      "metadata": {
        "mapbox:group": "101da9f13b64a08fa4b6ac1168e89e5f"
      },
      "source": "openmaptiles",
      "source-layer": "place",
      "maxzoom": 12,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "Point"
        ],
        [
          "all",
          [
            "==",
            "capital",
            2
          ],
          [
            "==",
            "class",
            "city"
          ]
        ],
        [
          "!has",
          "name:en"
        ]
      ],
      "layout": {
        "text-size": 14,
        "icon-image": {
          "base": 1,
          "stops": [
            [
              0,
              "star-11"
            ],
            [
              8,
              ""
            ]
          ]
        },
        "text-transform": "uppercase",
        "text-font": [
          "Metropolis Regular",
          "Klokantech Noto Sans Regular",
          "Klokantech Noto Sans CJK Regular"
        ],
        "text-justify": "left",
        "visibility": "visible",
        "text-offset": [
          0.5,
          0.2
        ],
        "icon-size": 1,
        "text-anchor": {
          "base": 1,
          "stops": [
            [
              0,
              "left"
            ],
            [
              8,
              "center"
            ]
          ]
        },
        "text-field": "{name:latin}\n{name:nonlatin}"
      },
      "paint": {
        "text-color": "rgb(117, 129, 145)",
        "text-halo-color": "rgb(242,243,240)",
        "text-halo-width": 1,
        "text-halo-blur": 1,
        "icon-opacity": 0.7
      }
    },
    {
      "id": "place_capital-en",
      "type": "symbol",
      "metadata": {
        "mapbox:group": "101da9f13b64a08fa4b6ac1168e89e5f"
      },
      "source": "openmaptiles",
      "source-layer": "place",
      "maxzoom": 12,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "Point"
        ],
        [
          "all",
          [
            "==",
            "capital",
            2
          ],
          [
            "==",
            "class",
            "city"
          ]
        ],
        [
          "has",
          "name:en"
        ]
      ],
      "layout": {
        "text-size": 14,
        "icon-image": {
          "base": 1,
          "stops": [
            [
              0,
              "star-11"
            ],
            [
              8,
              ""
            ]
          ]
        },
        "text-transform": "uppercase",
        "text-font": [
          "Metropolis Regular",
          "Klokantech Noto Sans Regular",
          "Klokantech Noto Sans CJK Regular"
        ],
        "text-justify": "left",
        "visibility": "visible",
        "text-offset": [
          0.5,
          0.2
        ],
        "icon-size": 1,
        "text-anchor": {
          "base": 1,
          "stops": [
            [
              0,
              "left"
            ],
            [
              8,
              "center"
            ]
          ]
        },
        "text-field": "{name:en}\n{name:nonlatin}"
      },
      "paint": {
        "text-color": "rgb(117, 129, 145)",
        "text-halo-color": "rgb(242,243,240)",
        "text-halo-width": 1,
        "text-halo-blur": 1,
        "icon-opacity": 0.7
      }
    },
    {
      "id": "place_city_large",
      "type": "symbol",
      "metadata": {
        "mapbox:group": "101da9f13b64a08fa4b6ac1168e89e5f"
      },
      "source": "openmaptiles",
      "source-layer": "place",
      "maxzoom": 12,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "Point"
        ],
        [
          "all",
          [
            "!=",
            "capital",
            2
          ],
          [
            "<=",
            "rank",
            3
          ],
          [
            "==",
            "class",
            "city"
          ]
        ],
        [
          "!has",
          "name:en"
        ]
      ],
      "layout": {
        "text-size": 14,
        "icon-image": {
          "base": 1,
          "stops": [
            [
              0,
              "circle-11"
            ],
            [
              8,
              ""
            ]
          ]
        },
        "text-transform": "uppercase",
        "text-font": [
          "Metropolis Regular",
          "Klokantech Noto Sans Regular",
          "Klokantech Noto Sans CJK Regular"
        ],
        "text-justify": "left",
        "visibility": "visible",
        "text-offset": [
          0.5,
          0.2
        ],
        "icon-size": 0.4,
        "text-anchor": {
          "base": 1,
          "stops": [
            [
              0,
              "left"
            ],
            [
              8,
              "center"
            ]
          ]
        },
        "text-field": "{name:latin}\n{name:nonlatin}"
      },
      "paint": {
        "text-color": "rgb(117, 129, 145)",
        "text-halo-color": "rgb(242,243,240)",
        "text-halo-width": 1,
        "text-halo-blur": 1,
        "icon-opacity": 0.7
      }
    },
    {
      "id": "place_city_large-en",
      "type": "symbol",
      "metadata": {
        "mapbox:group": "101da9f13b64a08fa4b6ac1168e89e5f"
      },
      "source": "openmaptiles",
      "source-layer": "place",
      "maxzoom": 12,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "Point"
        ],
        [
          "all",
          [
            "!=",
            "capital",
            2
          ],
          [
            "<=",
            "rank",
            3
          ],
          [
            "==",
            "class",
            "city"
          ]
        ],
        [
          "has",
          "name:en"
        ]
      ],
      "layout": {
        "text-size": 14,
        "icon-image": {
          "base": 1,
          "stops": [
            [
              0,
              "circle-11"
            ],
            [
              8,
              ""
            ]
          ]
        },
        "text-transform": "uppercase",
        "text-font": [
          "Metropolis Regular",
          "Klokantech Noto Sans Regular",
          "Klokantech Noto Sans CJK Regular"
        ],
        "text-justify": "left",
        "visibility": "visible",
        "text-offset": [
          0.5,
          0.2
        ],
        "icon-size": 0.4,
        "text-anchor": {
          "base": 1,
          "stops": [
            [
              0,
              "left"
            ],
            [
              8,
              "center"
            ]
          ]
        },
        "text-field": "{name:en}\n{name:nonlatin}"
      },
      "paint": {
        "text-color": "rgb(117, 129, 145)",
        "text-halo-color": "rgb(242,243,240)",
        "text-halo-width": 1,
        "text-halo-blur": 1,
        "icon-opacity": 0.7
      }
    },
    {
      "id": "place_state",
      "type": "symbol",
      "metadata": {
        "mapbox:group": "101da9f13b64a08fa4b6ac1168e89e5f"
      },
      "source": "openmaptiles",
      "source-layer": "place",
      "maxzoom": 12,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "Point"
        ],
        [
          "==",
          "class",
          "state"
        ],
        [
          "!has",
          "name:en"
        ]
      ],
      "layout": {
        "visibility": "visible",
        "text-field": "{name:latin}\n{name:nonlatin}",
        "text-font": [
          "Metropolis Regular",
          "Klokantech Noto Sans Regular",
          "Klokantech Noto Sans CJK Regular"
        ],
        "text-transform": "uppercase",
        "text-size": 10
      },
      "paint": {
        "text-color": "rgb(113, 129, 144)",
        "text-halo-color": "rgb(242,243,240)",
        "text-halo-width": 1,
        "text-halo-blur": 1
      }
    },
    {
      "id": "place_state-en",
      "type": "symbol",
      "metadata": {
        "mapbox:group": "101da9f13b64a08fa4b6ac1168e89e5f"
      },
      "source": "openmaptiles",
      "source-layer": "place",
      "maxzoom": 12,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "Point"
        ],
        [
          "==",
          "class",
          "state"
        ],
        [
          "has",
          "name:en"
        ]
      ],
      "layout": {
        "visibility": "visible",
        "text-field": "{name:en}\n{name:nonlatin}",
        "text-font": [
          "Metropolis Regular",
          "Klokantech Noto Sans Regular",
          "Klokantech Noto Sans CJK Regular"
        ],
        "text-transform": "uppercase",
        "text-size": 10
      },
      "paint": {
        "text-color": "rgb(113, 129, 144)",
        "text-halo-color": "rgb(242,243,240)",
        "text-halo-width": 1,
        "text-halo-blur": 1
      }
    },
    {
      "id": "place_country_other",
      "type": "symbol",
      "metadata": {
        "mapbox:group": "101da9f13b64a08fa4b6ac1168e89e5f"
      },
      "source": "openmaptiles",
      "source-layer": "place",
      "maxzoom": 8,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "Point"
        ],
        [
          "all",
          [
            "==",
            "class",
            "country"
          ],
          [
            ">=",
            "rank",
            2
          ]
        ],
        [
          "!has",
          "name:en"
        ]
      ],
      "layout": {
        "visibility": "visible",
        "text-field": "{name:latin}\n{name:nonlatin}",
        "text-font": [
          "Metropolis Regular",
          "Klokantech Noto Sans Regular",
          "Klokantech Noto Sans CJK Regular"
        ],
        "text-transform": "uppercase",
        "text-size": {
          "base": 1,
          "stops": [
            [
              0,
              10
            ],
            [
              6,
              12
            ]
          ]
        }
      },
      "paint": {
        "text-halo-width": 1.4,
        "text-halo-color": "rgba(236,236,234,0.7)",
        "text-color": {
          "base": 1,
          "stops": [
            [
              3,
              "rgb(157,169,177)"
            ],
            [
              4,
              "rgb(153, 153, 153)"
            ]
          ]
        }
      }
    },
    {
      "id": "place_country_other-en",
      "type": "symbol",
      "metadata": {
        "mapbox:group": "101da9f13b64a08fa4b6ac1168e89e5f"
      },
      "source": "openmaptiles",
      "source-layer": "place",
      "maxzoom": 8,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "Point"
        ],
        [
          "all",
          [
            "==",
            "class",
            "country"
          ],
          [
            ">=",
            "rank",
            2
          ]
        ],
        [
          "has",
          "name:en"
        ]
      ],
      "layout": {
        "visibility": "visible",
        "text-field": "{name:en}\n{name:nonlatin}",
        "text-font": [
          "Metropolis Regular",
          "Klokantech Noto Sans Regular",
          "Klokantech Noto Sans CJK Regular"
        ],
        "text-transform": "uppercase",
        "text-size": {
          "base": 1,
          "stops": [
            [
              0,
              10
            ],
            [
              6,
              12
            ]
          ]
        }
      },
      "paint": {
        "text-halo-width": 1.4,
        "text-halo-color": "rgba(236,236,234,0.7)",
        "text-color": {
          "base": 1,
          "stops": [
            [
              3,
              "rgb(157,169,177)"
            ],
            [
              4,
              "rgb(153, 153, 153)"
            ]
          ]
        }
      }
    },
    {
      "id": "place_country_major",
      "type": "symbol",
      "metadata": {
        "mapbox:group": "101da9f13b64a08fa4b6ac1168e89e5f"
      },
      "source": "openmaptiles",
      "source-layer": "place",
      "maxzoom": 6,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "Point"
        ],
        [
          "all",
          [
            "<=",
            "rank",
            1
          ],
          [
            "==",
            "class",
            "country"
          ]
        ],
        [
          "!has",
          "name:en"
        ]
      ],
      "layout": {
        "visibility": "visible",
        "text-field": "{name:latin}\n{name:nonlatin}",
        "text-font": [
          "Metropolis Regular",
          "Klokantech Noto Sans Regular",
          "Klokantech Noto Sans CJK Regular"
        ],
        "text-transform": "uppercase",
        "text-size": {
          "base": 1.4,
          "stops": [
            [
              0,
              10
            ],
            [
              3,
              12
            ],
            [
              4,
              14
            ]
          ]
        },
        "text-anchor": "center"
      },
      "paint": {
        "text-halo-width": 1.4,
        "text-halo-color": "rgba(236,236,234,0.7)",
        "text-color": {
          "base": 1,
          "stops": [
            [
              3,
              "rgb(157,169,177)"
            ],
            [
              4,
              "rgb(153, 153, 153)"
            ]
          ]
        }
      }
    },
    {
      "id": "place_country_major-en",
      "type": "symbol",
      "metadata": {
        "mapbox:group": "101da9f13b64a08fa4b6ac1168e89e5f"
      },
      "source": "openmaptiles",
      "source-layer": "place",
      "maxzoom": 6,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "Point"
        ],
        [
          "all",
          [
            "<=",
            "rank",
            1
          ],
          [
            "==",
            "class",
            "country"
          ]
        ],
        [
          "has",
          "name:en"
        ]
      ],
      "layout": {
        "visibility": "visible",
        "text-field": "{name:en}\n{name:nonlatin}",
        "text-font": [
          "Metropolis Regular",
          "Klokantech Noto Sans Regular",
          "Klokantech Noto Sans CJK Regular"
        ],
        "text-transform": "uppercase",
        "text-size": {
          "base": 1.4,
          "stops": [
            [
              0,
              10
            ],
            [
              3,
              12
            ],
            [
              4,
              14
            ]
          ]
        },
        "text-anchor": "center"
      },
      "paint": {
        "text-halo-width": 1.4,
        "text-halo-color": "rgba(236,236,234,0.7)",
        "text-color": {
          "base": 1,
          "stops": [
            [
              3,
              "rgb(157,169,177)"
            ],
            [
              4,
              "rgb(153, 153, 153)"
            ]
          ]
        }
      }
    }
  ],
  "id": "ciwf3o3u2008z2pmq7pmvm6xq"
});

const mapstyle_dark = () => ({
  "version": 8,
  "name": "Dark Matter",
  "metadata": {
    "mapbox:autocomposite": false,
    "mapbox:type": "template",
    "mapbox:groups": {
      "b6371a3f2f5a9932464fa3867530a2e5": {
        "name": "Transportation",
        "collapsed": false
      },
      "a14c9607bc7954ba1df7205bf660433f": {
        "name": "Boundaries"
      },
      "101da9f13b64a08fa4b6ac1168e89e5f": {
        "name": "Places",
        "collapsed": false
      }
    },
    "openmaptiles:version": "3.x",
    "openmaptiles:mapbox:owner": "openmaptiles",
    "openmaptiles:mapbox:source:url": "mapbox://openmaptiles.4qljc88t"
  },
  "center": [
    20.745027854803,
    50.39944115761509
  ],
  "zoom": 3.8053494517746405,
  "bearing": 0,
  "pitch": 0,
  "sources": {
    "openmaptiles": {
      "type": "vector",
      "url": "https://free.tilehosting.com/data/v3.json?key=hWWfWrAiWGtv68r8wA6D"
    },
    "bing-imagery": {
      "type": "raster",
      "tileSize": 256,
      "tiles": [
        "http://ecn.t2.tiles.virtualearth.net/tiles/a{quadkey}.jpeg?g=414"
      ]
    }
  },
  "sprite": "https://openmaptiles.github.io/dark-matter-gl-style/sprite",
  "glyphs": "https://free.tilehosting.com/fonts/{fontstack}/{range}.pbf?key=hWWfWrAiWGtv68r8wA6D",
  "layers": [
    {
      "id": "background",
      "type": "background",
      "paint": {
        "background-color": "rgb(12,12,12)"
      }
    },
    {
      "id": "water",
      "type": "fill",
      "source": "openmaptiles",
      "source-layer": "water",
      "filter": [
        "==",
        "$type",
        "Polygon"
      ],
      "layout": {
        "visibility": "visible"
      },
      "paint": {
        "fill-color": "rgb(27 ,27 ,29)",
        "fill-antialias": false
      }
    },
    {
      "id": "landcover_ice_shelf",
      "type": "fill",
      "source": "openmaptiles",
      "source-layer": "landcover",
      "maxzoom": 8,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "Polygon"
        ],
        [
          "==",
          "subclass",
          "ice_shelf"
        ]
      ],
      "layout": {
        "visibility": "visible"
      },
      "paint": {
        "fill-color": "rgb(12,12,12)",
        "fill-opacity": 0.7
      }
    },
    {
      "id": "landcover_glacier",
      "type": "fill",
      "source": "openmaptiles",
      "source-layer": "landcover",
      "maxzoom": 8,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "Polygon"
        ],
        [
          "==",
          "subclass",
          "glacier"
        ]
      ],
      "layout": {
        "visibility": "visible"
      },
      "paint": {
        "fill-color": "hsl(0, 1%, 2%)",
        "fill-opacity": {
          "base": 1,
          "stops": [
            [
              0,
              1
            ],
            [
              8,
              0.5
            ]
          ]
        }
      }
    },
    {
      "id": "landuse_residential",
      "type": "fill",
      "source": "openmaptiles",
      "source-layer": "landuse",
      "maxzoom": 9,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "Polygon"
        ],
        [
          "==",
          "class",
          "residential"
        ]
      ],
      "layout": {
        "visibility": "visible"
      },
      "paint": {
        "fill-color": "hsl(0, 2%, 5%)",
        "fill-opacity": 0.4
      }
    },
    {
      "id": "landcover_wood",
      "type": "fill",
      "source": "openmaptiles",
      "source-layer": "landcover",
      "minzoom": 10,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "Polygon"
        ],
        [
          "==",
          "class",
          "wood"
        ]
      ],
      "layout": {
        "visibility": "visible"
      },
      "paint": {
        "fill-color": "rgb(32,32,32)",
        "fill-opacity": {
          "base": 0.3,
          "stops": [
            [
              8,
              0
            ],
            [
              10,
              0.8
            ],
            [
              13,
              0.4
            ]
          ]
        },
        "fill-translate": [
          0,
          0
        ],
        "fill-pattern": "wood-pattern"
      }
    },
    {
      "id": "landuse_park",
      "type": "fill",
      "source": "openmaptiles",
      "source-layer": "landuse",
      "filter": [
        "all",
        [
          "==",
          "$type",
          "Polygon"
        ],
        [
          "==",
          "class",
          "park"
        ]
      ],
      "layout": {
        "visibility": "visible"
      },
      "paint": {
        "fill-color": "rgb(32,32,32)"
      }
    },
    {
      "id": "pgblackboard-sat",
      "type": "raster",
      "source": "bing-imagery",
      "layout": {
        "visibility":"none"
      }
    },
    {
      "id": "waterway",
      "type": "line",
      "source": "openmaptiles",
      "source-layer": "waterway",
      "filter": [
        "==",
        "$type",
        "LineString"
      ],
      "layout": {
        "visibility": "visible"
      },
      "paint": {
        "line-color": "rgb(27 ,27 ,29)"
      }
    },
    {
      "id": "water_name",
      "type": "symbol",
      "source": "openmaptiles",
      "source-layer": "water_name",
      "filter": [
        "all",
        [
          "==",
          "$type",
          "LineString"
        ],
        [
          "!has",
          "name:en"
        ]
      ],
      "layout": {
        "text-field": "{name:latin} {name:nonlatin}",
        "symbol-placement": "line",
        "text-rotation-alignment": "map",
        "symbol-spacing": 500,
        "text-font": [
          "Metropolis Medium Italic",
          "Klokantech Noto Sans Italic",
          "Klokantech Noto Sans CJK Regular"
        ],
        "text-size": 12
      },
      "paint": {
        "text-color": "hsla(0, 0%, 0%, 0.7)",
        "text-halo-color": "hsl(0, 0%, 27%)"
      }
    },
    {
      "id": "water_name-en",
      "type": "symbol",
      "source": "openmaptiles",
      "source-layer": "water_name",
      "filter": [
        "all",
        [
          "==",
          "$type",
          "LineString"
        ],
        [
          "has",
          "name:en"
        ]
      ],
      "layout": {
        "text-field": "{name:en} {name:nonlatin}",
        "symbol-placement": "line",
        "text-rotation-alignment": "map",
        "symbol-spacing": 500,
        "text-font": [
          "Metropolis Medium Italic",
          "Klokantech Noto Sans Italic",
          "Klokantech Noto Sans CJK Regular"
        ],
        "text-size": 12
      },
      "paint": {
        "text-color": "hsla(0, 0%, 0%, 0.7)",
        "text-halo-color": "hsl(0, 0%, 27%)"
      }
    },
    {
      "id": "building",
      "type": "fill",
      "source": "openmaptiles",
      "source-layer": "building",
      "minzoom": 12,
      "filter": [
        "==",
        "$type",
        "Polygon"
      ],
      "paint": {
        "fill-color": "rgb(10,10,10)",
        "fill-outline-color": "rgb(27 ,27 ,29)",
        "fill-antialias": true
      }
    },
    {
      "id": "aeroway-taxiway",
      "type": "line",
      "metadata": {
        "mapbox:group": "1444849345966.4436"
      },
      "source": "openmaptiles",
      "source-layer": "aeroway",
      "minzoom": 12,
      "filter": [
        "all",
        [
          "in",
          "class",
          "taxiway"
        ]
      ],
      "layout": {
        "line-cap": "round",
        "line-join": "round",
        "visibility": "visible"
      },
      "paint": {
        "line-color": "#181818",
        "line-width": {
          "base": 1.55,
          "stops": [
            [
              13,
              1.8
            ],
            [
              20,
              20
            ]
          ]
        },
        "line-opacity": 1
      }
    },
    {
      "id": "aeroway-runway-casing",
      "type": "line",
      "metadata": {
        "mapbox:group": "1444849345966.4436"
      },
      "source": "openmaptiles",
      "source-layer": "aeroway",
      "minzoom": 11,
      "filter": [
        "all",
        [
          "in",
          "class",
          "runway"
        ]
      ],
      "layout": {
        "line-cap": "round",
        "line-join": "round",
        "visibility": "visible"
      },
      "paint": {
        "line-color": "rgba(60,60,60,0.8)",
        "line-width": {
          "base": 1.5,
          "stops": [
            [
              11,
              5
            ],
            [
              17,
              55
            ]
          ]
        },
        "line-opacity": 1
      }
    },
    {
      "id": "aeroway-area",
      "type": "fill",
      "metadata": {
        "mapbox:group": "1444849345966.4436"
      },
      "source": "openmaptiles",
      "source-layer": "aeroway",
      "minzoom": 4,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "Polygon"
        ],
        [
          "in",
          "class",
          "runway",
          "taxiway"
        ]
      ],
      "layout": {
        "visibility": "visible"
      },
      "paint": {
        "fill-opacity": 1,
        "fill-color": "#000"
      }
    },
    {
      "id": "aeroway-runway",
      "type": "line",
      "metadata": {
        "mapbox:group": "1444849345966.4436"
      },
      "source": "openmaptiles",
      "source-layer": "aeroway",
      "minzoom": 11,
      "filter": [
        "all",
        [
          "in",
          "class",
          "runway"
        ],
        [
          "==",
          "$type",
          "LineString"
        ]
      ],
      "layout": {
        "line-cap": "round",
        "line-join": "round",
        "visibility": "visible"
      },
      "paint": {
        "line-color": "#000",
        "line-width": {
          "base": 1.5,
          "stops": [
            [
              11,
              4
            ],
            [
              17,
              50
            ]
          ]
        },
        "line-opacity": 1
      }
    },
    {
      "id": "highway_path",
      "type": "line",
      "metadata": {
        "mapbox:group": "b6371a3f2f5a9932464fa3867530a2e5"
      },
      "source": "openmaptiles",
      "source-layer": "transportation",
      "filter": [
        "all",
        [
          "==",
          "$type",
          "LineString"
        ],
        [
          "==",
          "class",
          "path"
        ]
      ],
      "layout": {
        "line-cap": "round",
        "line-join": "round",
        "visibility": "visible"
      },
      "paint": {
        "line-color": "rgb(27 ,27 ,29)",
        "line-width": {
          "base": 1.2,
          "stops": [
            [
              13,
              1
            ],
            [
              20,
              10
            ]
          ]
        },
        "line-opacity": 0.9,
        "line-dasharray": [
          1.5,
          1.5
        ]
      }
    },
    {
      "id": "highway_minor",
      "type": "line",
      "metadata": {
        "mapbox:group": "b6371a3f2f5a9932464fa3867530a2e5"
      },
      "source": "openmaptiles",
      "source-layer": "transportation",
      "minzoom": 8,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "LineString"
        ],
        [
          "in",
          "class",
          "minor",
          "service",
          "track"
        ]
      ],
      "layout": {
        "line-cap": "round",
        "line-join": "round",
        "visibility": "visible"
      },
      "paint": {
        "line-color": "#181818",
        "line-width": {
          "base": 1.55,
          "stops": [
            [
              13,
              1.8
            ],
            [
              20,
              20
            ]
          ]
        },
        "line-opacity": 0.9
      }
    },
    {
      "id": "highway_major_casing",
      "type": "line",
      "metadata": {
        "mapbox:group": "b6371a3f2f5a9932464fa3867530a2e5"
      },
      "source": "openmaptiles",
      "source-layer": "transportation",
      "minzoom": 11,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "LineString"
        ],
        [
          "in",
          "class",
          "primary",
          "secondary",
          "tertiary",
          "trunk"
        ]
      ],
      "layout": {
        "line-cap": "butt",
        "line-join": "miter",
        "visibility": "visible"
      },
      "paint": {
        "line-color": "rgba(60,60,60,0.8)",
        "line-dasharray": [
          12,
          0
        ],
        "line-width": {
          "base": 1.3,
          "stops": [
            [
              10,
              3
            ],
            [
              20,
              23
            ]
          ]
        }
      }
    },
    {
      "id": "highway_major_inner",
      "type": "line",
      "metadata": {
        "mapbox:group": "b6371a3f2f5a9932464fa3867530a2e5"
      },
      "source": "openmaptiles",
      "source-layer": "transportation",
      "minzoom": 11,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "LineString"
        ],
        [
          "in",
          "class",
          "primary",
          "secondary",
          "tertiary",
          "trunk"
        ]
      ],
      "layout": {
        "line-cap": "round",
        "line-join": "round",
        "visibility": "visible"
      },
      "paint": {
        "line-color": "hsl(0, 0%, 7%)",
        "line-width": {
          "base": 1.3,
          "stops": [
            [
              10,
              2
            ],
            [
              20,
              20
            ]
          ]
        }
      }
    },
    {
      "id": "highway_major_subtle",
      "type": "line",
      "metadata": {
        "mapbox:group": "b6371a3f2f5a9932464fa3867530a2e5"
      },
      "source": "openmaptiles",
      "source-layer": "transportation",
      "minzoom": 6,
      "maxzoom": 11,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "LineString"
        ],
        [
          "in",
          "class",
          "primary",
          "secondary",
          "tertiary",
          "trunk"
        ]
      ],
      "layout": {
        "line-cap": "round",
        "line-join": "round",
        "visibility": "visible"
      },
      "paint": {
        "line-color": "#2a2a2a",
        "line-width": {
          "stops": [
            [
              6,
              0
            ],
            [
              8,
              2
            ]
          ]
        }
      }
    },
    {
      "id": "highway_motorway_casing",
      "type": "line",
      "metadata": {
        "mapbox:group": "b6371a3f2f5a9932464fa3867530a2e5"
      },
      "source": "openmaptiles",
      "source-layer": "transportation",
      "minzoom": 6,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "LineString"
        ],
        [
          "==",
          "class",
          "motorway"
        ]
      ],
      "layout": {
        "line-cap": "butt",
        "line-join": "miter",
        "visibility": "visible"
      },
      "paint": {
        "line-color": "rgba(60,60,60,0.8)",
        "line-width": {
          "base": 1.4,
          "stops": [
            [
              5.8,
              0
            ],
            [
              6,
              3
            ],
            [
              20,
              40
            ]
          ]
        },
        "line-dasharray": [
          2,
          0
        ],
        "line-opacity": 1
      }
    },
    {
      "id": "highway_motorway_inner",
      "type": "line",
      "metadata": {
        "mapbox:group": "b6371a3f2f5a9932464fa3867530a2e5"
      },
      "source": "openmaptiles",
      "source-layer": "transportation",
      "minzoom": 6,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "LineString"
        ],
        [
          "==",
          "class",
          "motorway"
        ]
      ],
      "layout": {
        "line-cap": "round",
        "line-join": "round",
        "visibility": "visible"
      },
      "paint": {
        "line-color": {
          "base": 1,
          "stops": [
            [
              5.8,
              "hsla(0, 0%, 85%, 0.53)"
            ],
            [
              6,
              "#000"
            ]
          ]
        },
        "line-width": {
          "base": 1.4,
          "stops": [
            [
              4,
              2
            ],
            [
              6,
              1.3
            ],
            [
              20,
              30
            ]
          ]
        }
      }
    },
    {
      "id": "highway_motorway_subtle",
      "type": "line",
      "metadata": {
        "mapbox:group": "b6371a3f2f5a9932464fa3867530a2e5"
      },
      "source": "openmaptiles",
      "source-layer": "transportation",
      "maxzoom": 6,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "LineString"
        ],
        [
          "==",
          "class",
          "motorway"
        ]
      ],
      "layout": {
        "line-cap": "round",
        "line-join": "round",
        "visibility": "visible"
      },
      "paint": {
        "line-color": "#181818",
        "line-width": {
          "base": 1.4,
          "stops": [
            [
              4,
              2
            ],
            [
              6,
              1.3
            ]
          ]
        }
      }
    },
    {
      "id": "railway_transit",
      "type": "line",
      "metadata": {
        "mapbox:group": "b6371a3f2f5a9932464fa3867530a2e5"
      },
      "source": "openmaptiles",
      "source-layer": "transportation",
      "minzoom": 16,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "LineString"
        ],
        [
          "all",
          [
            "==",
            "class",
            "transit"
          ],
          [
            "!in",
            "brunnel",
            "tunnel"
          ]
        ]
      ],
      "layout": {
        "visibility": "visible",
        "line-join": "round"
      },
      "paint": {
        "line-color": "rgb(35,35,35)",
        "line-width": 3
      }
    },
    {
      "id": "railway_transit_dashline",
      "type": "line",
      "metadata": {
        "mapbox:group": "b6371a3f2f5a9932464fa3867530a2e5"
      },
      "source": "openmaptiles",
      "source-layer": "transportation",
      "minzoom": 16,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "LineString"
        ],
        [
          "all",
          [
            "==",
            "class",
            "transit"
          ],
          [
            "!in",
            "brunnel",
            "tunnel"
          ]
        ]
      ],
      "layout": {
        "visibility": "visible",
        "line-join": "round"
      },
      "paint": {
        "line-color": "rgb(12,12,12)",
        "line-width": 2,
        "line-dasharray": [
          3,
          3
        ]
      }
    },
    {
      "id": "railway_minor",
      "type": "line",
      "metadata": {
        "mapbox:group": "b6371a3f2f5a9932464fa3867530a2e5"
      },
      "source": "openmaptiles",
      "source-layer": "transportation",
      "minzoom": 16,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "LineString"
        ],
        [
          "all",
          [
            "==",
            "class",
            "rail"
          ],
          [
            "has",
            "service"
          ]
        ]
      ],
      "layout": {
        "visibility": "visible",
        "line-join": "round"
      },
      "paint": {
        "line-color": "rgb(35,35,35)",
        "line-width": 3
      }
    },
    {
      "id": "railway_minor_dashline",
      "type": "line",
      "metadata": {
        "mapbox:group": "b6371a3f2f5a9932464fa3867530a2e5"
      },
      "source": "openmaptiles",
      "source-layer": "transportation",
      "minzoom": 16,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "LineString"
        ],
        [
          "all",
          [
            "==",
            "class",
            "rail"
          ],
          [
            "has",
            "service"
          ]
        ]
      ],
      "layout": {
        "visibility": "visible",
        "line-join": "round"
      },
      "paint": {
        "line-color": "rgb(12,12,12)",
        "line-width": 2,
        "line-dasharray": [
          3,
          3
        ]
      }
    },
    {
      "id": "railway",
      "type": "line",
      "metadata": {
        "mapbox:group": "b6371a3f2f5a9932464fa3867530a2e5"
      },
      "source": "openmaptiles",
      "source-layer": "transportation",
      "minzoom": 13,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "LineString"
        ],
        [
          "==",
          "class",
          "rail"
        ],
        [
          "!has",
          "service"
        ]
      ],
      "layout": {
        "visibility": "visible",
        "line-join": "round"
      },
      "paint": {
        "line-width": {
          "base": 1.3,
          "stops": [
            [
              16,
              3
            ],
            [
              20,
              7
            ]
          ]
        },
        "line-color": "rgb(35,35,35)"
      }
    },
    {
      "id": "railway_dashline",
      "type": "line",
      "metadata": {
        "mapbox:group": "b6371a3f2f5a9932464fa3867530a2e5"
      },
      "source": "openmaptiles",
      "source-layer": "transportation",
      "minzoom": 13,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "LineString"
        ],
        [
          "==",
          "class",
          "rail"
        ],
        [
          "!has",
          "service"
        ]
      ],
      "layout": {
        "visibility": "visible",
        "line-join": "round"
      },
      "paint": {
        "line-color": "rgb(12,12,12)",
        "line-width": {
          "base": 1.3,
          "stops": [
            [
              16,
              2
            ],
            [
              20,
              6
            ]
          ]
        },
        "line-dasharray": [
          3,
          3
        ]
      }
    },
    {
      "id": "highway_name_other",
      "type": "symbol",
      "metadata": {
        "mapbox:group": "b6371a3f2f5a9932464fa3867530a2e5"
      },
      "source": "openmaptiles",
      "source-layer": "transportation_name",
      "filter": [
        "all",
        [
          "!=",
          "class",
          "motorway"
        ],
        [
          "==",
          "$type",
          "LineString"
        ],
        [
          "!has",
          "name:en"
        ]
      ],
      "layout": {
        "text-size": 10,
        "text-max-angle": 30,
        "text-transform": "uppercase",
        "symbol-spacing": 350,
        "text-font": [
          "Metropolis Regular",
          "Klokantech Noto Sans Regular",
          "Klokantech Noto Sans CJK Regular"
        ],
        "symbol-placement": "line",
        "visibility": "visible",
        "text-rotation-alignment": "map",
        "text-pitch-alignment": "viewport",
        "text-field": "{name:latin} {name:nonlatin}"
      },
      "paint": {
        "text-color": "rgba(80, 78, 78, 1)",
        "text-translate": [
          0,
          0
        ],
        "text-halo-color": "rgba(0, 0, 0, 1)",
        "text-halo-width": 1,
        "text-halo-blur": 0
      }
    },
    {
      "id": "highway_name_other-en",
      "type": "symbol",
      "metadata": {
        "mapbox:group": "b6371a3f2f5a9932464fa3867530a2e5"
      },
      "source": "openmaptiles",
      "source-layer": "transportation_name",
      "filter": [
        "all",
        [
          "!=",
          "class",
          "motorway"
        ],
        [
          "==",
          "$type",
          "LineString"
        ],
        [
          "has",
          "name:en"
        ]
      ],
      "layout": {
        "text-size": 10,
        "text-max-angle": 30,
        "text-transform": "uppercase",
        "symbol-spacing": 350,
        "text-font": [
          "Metropolis Regular",
          "Klokantech Noto Sans Regular",
          "Klokantech Noto Sans CJK Regular"
        ],
        "symbol-placement": "line",
        "visibility": "visible",
        "text-rotation-alignment": "map",
        "text-pitch-alignment": "viewport",
        "text-field": "{name:en} {name:nonlatin}"
      },
      "paint": {
        "text-color": "rgba(80, 78, 78, 1)",
        "text-translate": [
          0,
          0
        ],
        "text-halo-color": "rgba(0, 0, 0, 1)",
        "text-halo-width": 1,
        "text-halo-blur": 0
      }
    },
    {
      "id": "highway_name_motorway",
      "type": "symbol",
      "metadata": {
        "mapbox:group": "b6371a3f2f5a9932464fa3867530a2e5"
      },
      "source": "openmaptiles",
      "source-layer": "transportation_name",
      "filter": [
        "all",
        [
          "==",
          "$type",
          "LineString"
        ],
        [
          "==",
          "class",
          "motorway"
        ]
      ],
      "layout": {
        "text-size": 10,
        "symbol-spacing": 350,
        "text-font": [
          "Metropolis Light",
          "Klokantech Noto Sans Regular",
          "Klokantech Noto Sans CJK Regular"
        ],
        "symbol-placement": "line",
        "visibility": "visible",
        "text-rotation-alignment": "viewport",
        "text-pitch-alignment": "viewport",
        "text-field": "{ref}"
      },
      "paint": {
        "text-color": "hsl(0, 0%, 37%)",
        "text-translate": [
          0,
          2
        ]
      }
    },
    {
      "id": "boundary_state",
      "type": "line",
      "metadata": {
        "mapbox:group": "a14c9607bc7954ba1df7205bf660433f"
      },
      "source": "openmaptiles",
      "source-layer": "boundary",
      "filter": [
        "==",
        "admin_level",
        4
      ],
      "layout": {
        "line-cap": "round",
        "line-join": "round",
        "visibility": "visible"
      },
      "paint": {
        "line-color": "hsl(0, 0%, 21%)",
        "line-width": {
          "base": 1.3,
          "stops": [
            [
              3,
              1
            ],
            [
              22,
              15
            ]
          ]
        },
        "line-blur": 0.4,
        "line-dasharray": [
          2,
          2
        ],
        "line-opacity": 1
      }
    },
    {
      "id": "boundary_country",
      "type": "line",
      "metadata": {
        "mapbox:group": "a14c9607bc7954ba1df7205bf660433f"
      },
      "source": "openmaptiles",
      "source-layer": "boundary",
      "filter": [
        "==",
        "admin_level",
        2
      ],
      "layout": {
        "line-cap": "round",
        "line-join": "round"
      },
      "paint": {
        "line-color": "hsl(0, 0%, 23%)",
        "line-width": {
          "base": 1.1,
          "stops": [
            [
              3,
              1
            ],
            [
              22,
              20
            ]
          ]
        },
        "line-blur": {
          "base": 1,
          "stops": [
            [
              0,
              0.4
            ],
            [
              22,
              4
            ]
          ]
        },
        "line-opacity": 1
      }
    },
    {
      "id": "place_other",
      "type": "symbol",
      "metadata": {
        "mapbox:group": "101da9f13b64a08fa4b6ac1168e89e5f"
      },
      "source": "openmaptiles",
      "source-layer": "place",
      "maxzoom": 14,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "Point"
        ],
        [
          "in",
          "class",
          "hamlet",
          "isolated_dwelling",
          "neighbourhood"
        ],
        [
          "!has",
          "name:en"
        ]
      ],
      "layout": {
        "text-size": 10,
        "text-transform": "uppercase",
        "text-font": [
          "Metropolis Regular",
          "Klokantech Noto Sans Regular",
          "Klokantech Noto Sans CJK Regular"
        ],
        "text-justify": "center",
        "visibility": "visible",
        "text-offset": [
          0.5,
          0
        ],
        "text-anchor": "center",
        "text-field": "{name:latin}\n{name:nonlatin}"
      },
      "paint": {
        "text-color": "rgb(101,101,101)",
        "text-halo-color": "rgba(0,0,0,0.7)",
        "text-halo-width": 1,
        "text-halo-blur": 1
      }
    },
    {
      "id": "place_other-en",
      "type": "symbol",
      "metadata": {
        "mapbox:group": "101da9f13b64a08fa4b6ac1168e89e5f"
      },
      "source": "openmaptiles",
      "source-layer": "place",
      "maxzoom": 14,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "Point"
        ],
        [
          "in",
          "class",
          "hamlet",
          "isolated_dwelling",
          "neighbourhood"
        ],
        [
          "has",
          "name:en"
        ]
      ],
      "layout": {
        "text-size": 10,
        "text-transform": "uppercase",
        "text-font": [
          "Metropolis Regular",
          "Klokantech Noto Sans Regular",
          "Klokantech Noto Sans CJK Regular"
        ],
        "text-justify": "center",
        "visibility": "visible",
        "text-offset": [
          0.5,
          0
        ],
        "text-anchor": "center",
        "text-field": "{name:en}\n{name:nonlatin}"
      },
      "paint": {
        "text-color": "rgb(101,101,101)",
        "text-halo-color": "rgba(0,0,0,0.7)",
        "text-halo-width": 1,
        "text-halo-blur": 1
      }
    },
    {
      "id": "place_suburb",
      "type": "symbol",
      "metadata": {
        "mapbox:group": "101da9f13b64a08fa4b6ac1168e89e5f"
      },
      "source": "openmaptiles",
      "source-layer": "place",
      "maxzoom": 15,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "Point"
        ],
        [
          "==",
          "class",
          "suburb"
        ],
        [
          "!has",
          "name:en"
        ]
      ],
      "layout": {
        "text-size": 10,
        "text-transform": "uppercase",
        "text-font": [
          "Metropolis Regular",
          "Klokantech Noto Sans Regular",
          "Klokantech Noto Sans CJK Regular"
        ],
        "text-justify": "center",
        "visibility": "visible",
        "text-offset": [
          0.5,
          0
        ],
        "text-anchor": "center",
        "text-field": "{name:latin}\n{name:nonlatin}"
      },
      "paint": {
        "text-color": "rgb(101,101,101)",
        "text-halo-color": "rgba(0,0,0,0.7)",
        "text-halo-width": 1,
        "text-halo-blur": 1
      }
    },
    {
      "id": "place_suburb-en",
      "type": "symbol",
      "metadata": {
        "mapbox:group": "101da9f13b64a08fa4b6ac1168e89e5f"
      },
      "source": "openmaptiles",
      "source-layer": "place",
      "maxzoom": 15,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "Point"
        ],
        [
          "==",
          "class",
          "suburb"
        ],
        [
          "has",
          "name:en"
        ]
      ],
      "layout": {
        "text-size": 10,
        "text-transform": "uppercase",
        "text-font": [
          "Metropolis Regular",
          "Klokantech Noto Sans Regular",
          "Klokantech Noto Sans CJK Regular"
        ],
        "text-justify": "center",
        "visibility": "visible",
        "text-offset": [
          0.5,
          0
        ],
        "text-anchor": "center",
        "text-field": "{name:en}\n{name:nonlatin}"
      },
      "paint": {
        "text-color": "rgb(101,101,101)",
        "text-halo-color": "rgba(0,0,0,0.7)",
        "text-halo-width": 1,
        "text-halo-blur": 1
      }
    },
    {
      "id": "place_village",
      "type": "symbol",
      "metadata": {
        "mapbox:group": "101da9f13b64a08fa4b6ac1168e89e5f"
      },
      "source": "openmaptiles",
      "source-layer": "place",
      "maxzoom": 14,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "Point"
        ],
        [
          "==",
          "class",
          "village"
        ],
        [
          "!has",
          "name:en"
        ]
      ],
      "layout": {
        "text-size": 10,
        "text-transform": "uppercase",
        "text-font": [
          "Metropolis Regular",
          "Klokantech Noto Sans Regular",
          "Klokantech Noto Sans CJK Regular"
        ],
        "text-justify": "left",
        "visibility": "visible",
        "text-offset": [
          0.5,
          0.2
        ],
        "icon-size": 0.4,
        "text-anchor": "left",
        "text-field": "{name:latin}\n{name:nonlatin}"
      },
      "paint": {
        "text-color": "rgb(101,101,101)",
        "text-halo-color": "rgba(0,0,0,0.7)",
        "text-halo-width": 1,
        "text-halo-blur": 1,
        "icon-opacity": 0.7
      }
    },
    {
      "id": "place_village-en",
      "type": "symbol",
      "metadata": {
        "mapbox:group": "101da9f13b64a08fa4b6ac1168e89e5f"
      },
      "source": "openmaptiles",
      "source-layer": "place",
      "maxzoom": 14,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "Point"
        ],
        [
          "==",
          "class",
          "village"
        ],
        [
          "has",
          "name:en"
        ]
      ],
      "layout": {
        "text-size": 10,
        "text-transform": "uppercase",
        "text-font": [
          "Metropolis Regular",
          "Klokantech Noto Sans Regular",
          "Klokantech Noto Sans CJK Regular"
        ],
        "text-justify": "left",
        "visibility": "visible",
        "text-offset": [
          0.5,
          0.2
        ],
        "icon-size": 0.4,
        "text-anchor": "left",
        "text-field": "{name:en}\n{name:nonlatin}"
      },
      "paint": {
        "text-color": "rgb(101,101,101)",
        "text-halo-color": "rgba(0,0,0,0.7)",
        "text-halo-width": 1,
        "text-halo-blur": 1,
        "icon-opacity": 0.7
      }
    },
    {
      "id": "place_town",
      "type": "symbol",
      "metadata": {
        "mapbox:group": "101da9f13b64a08fa4b6ac1168e89e5f"
      },
      "source": "openmaptiles",
      "source-layer": "place",
      "maxzoom": 15,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "Point"
        ],
        [
          "==",
          "class",
          "town"
        ],
        [
          "!has",
          "name:en"
        ]
      ],
      "layout": {
        "text-size": 10,
        "icon-image": {
          "base": 1,
          "stops": [
            [
              0,
              "circle-11"
            ],
            [
              9,
              ""
            ]
          ]
        },
        "text-transform": "uppercase",
        "text-font": [
          "Metropolis Regular",
          "Klokantech Noto Sans Regular",
          "Klokantech Noto Sans CJK Regular"
        ],
        "text-justify": "left",
        "visibility": "visible",
        "text-offset": [
          0.5,
          0.2
        ],
        "icon-size": 0.4,
        "text-anchor": {
          "base": 1,
          "stops": [
            [
              0,
              "left"
            ],
            [
              8,
              "center"
            ]
          ]
        },
        "text-field": "{name:latin}\n{name:nonlatin}"
      },
      "paint": {
        "text-color": "rgb(101,101,101)",
        "text-halo-color": "rgba(0,0,0,0.7)",
        "text-halo-width": 1,
        "text-halo-blur": 1,
        "icon-opacity": 0.7
      }
    },
    {
      "id": "place_town-en",
      "type": "symbol",
      "metadata": {
        "mapbox:group": "101da9f13b64a08fa4b6ac1168e89e5f"
      },
      "source": "openmaptiles",
      "source-layer": "place",
      "maxzoom": 15,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "Point"
        ],
        [
          "==",
          "class",
          "town"
        ],
        [
          "has",
          "name:en"
        ]
      ],
      "layout": {
        "text-size": 10,
        "icon-image": {
          "base": 1,
          "stops": [
            [
              0,
              "circle-11"
            ],
            [
              9,
              ""
            ]
          ]
        },
        "text-transform": "uppercase",
        "text-font": [
          "Metropolis Regular",
          "Klokantech Noto Sans Regular",
          "Klokantech Noto Sans CJK Regular"
        ],
        "text-justify": "left",
        "visibility": "visible",
        "text-offset": [
          0.5,
          0.2
        ],
        "icon-size": 0.4,
        "text-anchor": {
          "base": 1,
          "stops": [
            [
              0,
              "left"
            ],
            [
              8,
              "center"
            ]
          ]
        },
        "text-field": "{name:en}\n{name:nonlatin}"
      },
      "paint": {
        "text-color": "rgb(101,101,101)",
        "text-halo-color": "rgba(0,0,0,0.7)",
        "text-halo-width": 1,
        "text-halo-blur": 1,
        "icon-opacity": 0.7
      }
    },
    {
      "id": "place_city",
      "type": "symbol",
      "metadata": {
        "mapbox:group": "101da9f13b64a08fa4b6ac1168e89e5f"
      },
      "source": "openmaptiles",
      "source-layer": "place",
      "maxzoom": 14,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "Point"
        ],
        [
          "any",
          [
            "==",
            "class",
            "city"
          ],
          [
            ">",
            "rank",
            2
          ]
        ],
        [
          "!has",
          "name:en"
        ]
      ],
      "layout": {
        "text-size": 10,
        "icon-image": {
          "base": 1,
          "stops": [
            [
              0,
              "circle-11"
            ],
            [
              9,
              ""
            ]
          ]
        },
        "text-transform": "uppercase",
        "text-font": [
          "Metropolis Regular",
          "Klokantech Noto Sans Regular",
          "Klokantech Noto Sans CJK Regular"
        ],
        "text-justify": "left",
        "visibility": "visible",
        "text-offset": [
          0.5,
          0.2
        ],
        "icon-size": 0.4,
        "text-anchor": {
          "base": 1,
          "stops": [
            [
              0,
              "left"
            ],
            [
              8,
              "center"
            ]
          ]
        },
        "text-field": "{name:latin}\n{name:nonlatin}"
      },
      "paint": {
        "text-color": "rgb(101,101,101)",
        "text-halo-color": "rgba(0,0,0,0.7)",
        "text-halo-width": 1,
        "text-halo-blur": 1,
        "icon-opacity": 0.7
      }
    },
    {
      "id": "place_city-en",
      "type": "symbol",
      "metadata": {
        "mapbox:group": "101da9f13b64a08fa4b6ac1168e89e5f"
      },
      "source": "openmaptiles",
      "source-layer": "place",
      "maxzoom": 14,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "Point"
        ],
        [
          "any",
          [
            "==",
            "class",
            "city"
          ],
          [
            ">",
            "rank",
            2
          ]
        ],
        [
          "has",
          "name:en"
        ]
      ],
      "layout": {
        "text-size": 10,
        "icon-image": {
          "base": 1,
          "stops": [
            [
              0,
              "circle-11"
            ],
            [
              9,
              ""
            ]
          ]
        },
        "text-transform": "uppercase",
        "text-font": [
          "Metropolis Regular",
          "Klokantech Noto Sans Regular",
          "Klokantech Noto Sans CJK Regular"
        ],
        "text-justify": "left",
        "visibility": "visible",
        "text-offset": [
          0.5,
          0.2
        ],
        "icon-size": 0.4,
        "text-anchor": {
          "base": 1,
          "stops": [
            [
              0,
              "left"
            ],
            [
              8,
              "center"
            ]
          ]
        },
        "text-field": "{name:en}\n{name:nonlatin}"
      },
      "paint": {
        "text-color": "rgb(101,101,101)",
        "text-halo-color": "rgba(0,0,0,0.7)",
        "text-halo-width": 1,
        "text-halo-blur": 1,
        "icon-opacity": 0.7
      }
    },
    {
      "id": "place_city_large",
      "type": "symbol",
      "metadata": {
        "mapbox:group": "101da9f13b64a08fa4b6ac1168e89e5f"
      },
      "source": "openmaptiles",
      "source-layer": "place",
      "maxzoom": 12,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "Point"
        ],
        [
          "all",
          [
            "<=",
            "rank",
            3
          ],
          [
            "==",
            "class",
            "city"
          ]
        ],
        [
          "!has",
          "name:en"
        ]
      ],
      "layout": {
        "text-size": 14,
        "icon-image": {
          "base": 1,
          "stops": [
            [
              0,
              "circle-11"
            ],
            [
              9,
              ""
            ]
          ]
        },
        "text-transform": "uppercase",
        "text-font": [
          "Metropolis Regular",
          "Klokantech Noto Sans Regular",
          "Klokantech Noto Sans CJK Regular"
        ],
        "text-justify": "left",
        "visibility": "visible",
        "text-offset": [
          0.5,
          0.2
        ],
        "icon-size": 0.4,
        "text-anchor": {
          "base": 1,
          "stops": [
            [
              0,
              "left"
            ],
            [
              8,
              "center"
            ]
          ]
        },
        "text-field": "{name:latin}\n{name:nonlatin}"
      },
      "paint": {
        "text-color": "rgb(101,101,101)",
        "text-halo-color": "rgba(0,0,0,0.7)",
        "text-halo-width": 1,
        "text-halo-blur": 1,
        "icon-opacity": 0.7
      }
    },
    {
      "id": "place_city_large-en",
      "type": "symbol",
      "metadata": {
        "mapbox:group": "101da9f13b64a08fa4b6ac1168e89e5f"
      },
      "source": "openmaptiles",
      "source-layer": "place",
      "maxzoom": 12,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "Point"
        ],
        [
          "all",
          [
            "<=",
            "rank",
            3
          ],
          [
            "==",
            "class",
            "city"
          ]
        ],
        [
          "has",
          "name:en"
        ]
      ],
      "layout": {
        "text-size": 14,
        "icon-image": {
          "base": 1,
          "stops": [
            [
              0,
              "circle-11"
            ],
            [
              9,
              ""
            ]
          ]
        },
        "text-transform": "uppercase",
        "text-font": [
          "Metropolis Regular",
          "Klokantech Noto Sans Regular",
          "Klokantech Noto Sans CJK Regular"
        ],
        "text-justify": "left",
        "visibility": "visible",
        "text-offset": [
          0.5,
          0.2
        ],
        "icon-size": 0.4,
        "text-anchor": {
          "base": 1,
          "stops": [
            [
              0,
              "left"
            ],
            [
              8,
              "center"
            ]
          ]
        },
        "text-field": "{name:en}\n{name:nonlatin}"
      },
      "paint": {
        "text-color": "rgb(101,101,101)",
        "text-halo-color": "rgba(0,0,0,0.7)",
        "text-halo-width": 1,
        "text-halo-blur": 1,
        "icon-opacity": 0.7
      }
    },
    {
      "id": "place_state",
      "type": "symbol",
      "metadata": {
        "mapbox:group": "101da9f13b64a08fa4b6ac1168e89e5f"
      },
      "source": "openmaptiles",
      "source-layer": "place",
      "maxzoom": 12,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "Point"
        ],
        [
          "==",
          "class",
          "state"
        ],
        [
          "!has",
          "name:en"
        ]
      ],
      "layout": {
        "visibility": "visible",
        "text-field": "{name:latin}\n{name:nonlatin}",
        "text-font": [
          "Metropolis Regular",
          "Klokantech Noto Sans Regular",
          "Klokantech Noto Sans CJK Regular"
        ],
        "text-transform": "uppercase",
        "text-size": 10
      },
      "paint": {
        "text-color": "rgb(101,101,101)",
        "text-halo-color": "rgba(0,0,0,0.7)",
        "text-halo-width": 1,
        "text-halo-blur": 1
      }
    },
    {
      "id": "place_state-en",
      "type": "symbol",
      "metadata": {
        "mapbox:group": "101da9f13b64a08fa4b6ac1168e89e5f"
      },
      "source": "openmaptiles",
      "source-layer": "place",
      "maxzoom": 12,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "Point"
        ],
        [
          "==",
          "class",
          "state"
        ],
        [
          "has",
          "name:en"
        ]
      ],
      "layout": {
        "visibility": "visible",
        "text-field": "{name:en}\n{name:nonlatin}",
        "text-font": [
          "Metropolis Regular",
          "Klokantech Noto Sans Regular",
          "Klokantech Noto Sans CJK Regular"
        ],
        "text-transform": "uppercase",
        "text-size": 10
      },
      "paint": {
        "text-color": "rgb(101,101,101)",
        "text-halo-color": "rgba(0,0,0,0.7)",
        "text-halo-width": 1,
        "text-halo-blur": 1
      }
    },
    {
      "id": "place_country_other",
      "type": "symbol",
      "metadata": {
        "mapbox:group": "101da9f13b64a08fa4b6ac1168e89e5f"
      },
      "source": "openmaptiles",
      "source-layer": "place",
      "maxzoom": 8,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "Point"
        ],
        [
          "all",
          [
            "==",
            "class",
            "country"
          ],
          [
            ">=",
            "rank",
            2
          ]
        ],
        [
          "!has",
          "name:en"
        ]
      ],
      "layout": {
        "visibility": "visible",
        "text-field": "{name:latin}\n{name:nonlatin}",
        "text-font": [
          "Metropolis Regular",
          "Klokantech Noto Sans Regular",
          "Klokantech Noto Sans CJK Regular"
        ],
        "text-transform": "uppercase",
        "text-size": {
          "base": 1,
          "stops": [
            [
              0,
              10
            ],
            [
              6,
              12
            ]
          ]
        }
      },
      "paint": {
        "text-halo-width": 1.4,
        "text-halo-color": "rgba(0,0,0,0.7)",
        "text-color": "rgb(101,101,101)"
      }
    },
    {
      "id": "place_country_other-en",
      "type": "symbol",
      "metadata": {
        "mapbox:group": "101da9f13b64a08fa4b6ac1168e89e5f"
      },
      "source": "openmaptiles",
      "source-layer": "place",
      "maxzoom": 8,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "Point"
        ],
        [
          "all",
          [
            "==",
            "class",
            "country"
          ],
          [
            ">=",
            "rank",
            2
          ]
        ],
        [
          "has",
          "name:en"
        ]
      ],
      "layout": {
        "visibility": "visible",
        "text-field": "{name:en}\n{name:nonlatin}",
        "text-font": [
          "Metropolis Regular",
          "Klokantech Noto Sans Regular",
          "Klokantech Noto Sans CJK Regular"
        ],
        "text-transform": "uppercase",
        "text-size": {
          "base": 1,
          "stops": [
            [
              0,
              10
            ],
            [
              6,
              12
            ]
          ]
        }
      },
      "paint": {
        "text-halo-width": 1.4,
        "text-halo-color": "rgba(0,0,0,0.7)",
        "text-color": "rgb(101,101,101)"
      }
    },
    {
      "id": "place_country_major",
      "type": "symbol",
      "metadata": {
        "mapbox:group": "101da9f13b64a08fa4b6ac1168e89e5f"
      },
      "source": "openmaptiles",
      "source-layer": "place",
      "maxzoom": 6,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "Point"
        ],
        [
          "all",
          [
            "<=",
            "rank",
            1
          ],
          [
            "==",
            "class",
            "country"
          ]
        ],
        [
          "!has",
          "name:en"
        ]
      ],
      "layout": {
        "visibility": "visible",
        "text-field": "{name:latin}\n{name:nonlatin}",
        "text-font": [
          "Metropolis Regular",
          "Klokantech Noto Sans Regular",
          "Klokantech Noto Sans CJK Regular"
        ],
        "text-transform": "uppercase",
        "text-size": {
          "base": 1.4,
          "stops": [
            [
              0,
              10
            ],
            [
              3,
              12
            ],
            [
              4,
              14
            ]
          ]
        },
        "text-anchor": "center"
      },
      "paint": {
        "text-halo-width": 1.4,
        "text-halo-color": "rgba(0,0,0,0.7)",
        "text-color": "rgb(101,101,101)"
      }
    },
    {
      "id": "place_country_major-en",
      "type": "symbol",
      "metadata": {
        "mapbox:group": "101da9f13b64a08fa4b6ac1168e89e5f"
      },
      "source": "openmaptiles",
      "source-layer": "place",
      "maxzoom": 6,
      "filter": [
        "all",
        [
          "==",
          "$type",
          "Point"
        ],
        [
          "all",
          [
            "<=",
            "rank",
            1
          ],
          [
            "==",
            "class",
            "country"
          ]
        ],
        [
          "has",
          "name:en"
        ]
      ],
      "layout": {
        "visibility": "visible",
        "text-field": "{name:en}\n{name:nonlatin}",
        "text-font": [
          "Metropolis Regular",
          "Klokantech Noto Sans Regular",
          "Klokantech Noto Sans CJK Regular"
        ],
        "text-transform": "uppercase",
        "text-size": {
          "base": 1.4,
          "stops": [
            [
              0,
              10
            ],
            [
              3,
              12
            ],
            [
              4,
              14
            ]
          ]
        },
        "text-anchor": "center"
      },
      "paint": {
        "text-halo-width": 1.4,
        "text-halo-color": "rgba(0,0,0,0.7)",
        "text-color": "rgb(101,101,101)"
      }
    }
  ],
  "id": "ciwf4jmfe00882qmzvu5vh0zx"
});
