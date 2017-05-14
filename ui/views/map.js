define(function (require, exports, module) {
  'use strict';
  const dispatch = require('../core/dispatch');
  const L = window.L;
  
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

  const render_map_popup = require('./map_popup');
  const bus = require('../core/bus');

  const baselayers_conf = [{
    name: 'Map',
    url_tmpl: 'https://{s}.tiles.mapbox.com/v3/exe-dealer.{theme}/{z}/{x}/{y}.png',
    theme_map: { dark: 'hi8gc0eh', light: 'joap11pl' },
  }, {
    name: 'Imagery',
    url_tmpl: 'http://ak.dynamic.t{s}.tiles.virtualearth.net/comp/ch/{quadkey}?mkt=en-us&it=A,G,L&shading=hill&og=23&n=z',
    subdomains: '01234567',
  }];

  module.exports = render_map;

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
      this._leaflet_map = L.map(container_el, {
        center: [20 /* push antarctida down */, 0],
        zoom: 1,
        zoomControl: false,
        attributionControl: false,
        preferCanvas: true,
      });

      this._leaflet_map.addControl(L.control.scale({
        updateWhenIdle: true,
      }));
      const baselayers = baselayers_conf.map(conf => L.tileLayer(
        conf.url_tmpl, 
        Object.assign({}, conf, {
          quadkey,
          detectRetina: true,
          theme: _ => conf.theme_map.light,
        })
      ));

      this._layers_ctl = L.control.layers(null, null, {
        collapsed: false
      });
      for (let it of baselayers) {
        this._layers_ctl.addBaseLayer(it, it.options.name);
      }
      this._leaflet_map.addControl(this._layers_ctl)
        .addLayer(baselayers[0]);

      this._overlays_group
        = L.featureGroup()
        .addTo(this._leaflet_map)
        .on('click', this._handle_feature_click.bind(this));

      // bus.on('table_row_navigate', this._handle_row_focus.bind(this));
      // this._handle_feature_click = this._handle_feature_click.bind(this);
      this._handle_row_focus = this._handle_row_focus.bind(this);
      this._invalidate_size = this._invalidate_size.bind(this);

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
      this._leaflet_map.invalidateSize();
    }
    _handle_row_focus({ stmt_index, row_index, should_map_move }) {
      let feature_layer;
      if (
        should_map_move &&
        (feature_layer = this._get_feature_layer({ stmt_index, row_index }))
      ) {
        this._leaflet_map.fitBounds(
          feature_layer.getBounds
            ? feature_layer.getBounds()
            : L.latLngBounds(feature_layer.getLatLng(), feature_layer.getLatLng())
        );
      }
    }
    _get_feature_layer({ stmt_index, row_index }) {
      return this._leaflet_map._layers[`pgbb_${stmt_index}_${row_index}`];
    }
    _handle_feature_click(e) {
      const { stmt_index, row_index } = e.layer.feature.properties;
      dispatch({
        type: 'ROW_FOCUS',
        stmt_index,
        row_index,
        should_table_scroll: true,
      });
    }
    update({ stmt_results, focused_row }) {
      this._leaflet_map.invalidateSize();
      this._overlays_group.eachLayer(layer => this._layers_ctl.removeLayer(layer));
      this._overlays_group.clearLayers();

      stmt_results
        .map(({ src_table, rows, fields }, stmt_index) => ({
          name: src_table && src_table.table_name || String(stmt_index + 1),
          features: stmt_features({ rows, fields, stmt_index }),
        }))
        .filter(({ features }) => features)
        .map(({ name, features }) => L.geoJson(features, {
          name,
          style: compute_feature_style,
          pointToLayer: point_to_layer,
          onEachFeature: on_each_feature,
        }))
        .forEach(overlay => {
          this._layers_ctl.addOverlay(overlay, overlay.options.name);
          this._overlays_group.addLayer(overlay);
        });

      let focused_feature;
      if (focused_row && (focused_feature = this._get_feature_layer(focused_row))) {
        focused_feature.setStyle({ color: 'red' });
      }
    }
  }


  function on_each_feature(feature, layer) {
    const { stmt_index, row_index } = feature.properties;
    layer._leaflet_id = `pgbb_${stmt_index}_${row_index}`;
  }

  function stmt_features({ rows, fields, stmt_index }) {
    if (!fields || !rows) {
      return;
    }
    const geom_field_idx
      = fields
      .map(({ name }) => name)
      .indexOf('st_asgeojson');

    if (geom_field_idx < 0) {
      return;
    }
    return rows.map((row, row_index) => ({
      type: 'Feature',
      geometry: JSON.parse(row[geom_field_idx]),
      properties: { stmt_index, row_index },
    }));
  }

  function compute_feature_style(feature) {
    const { stmt_index } = feature.properties;
    const color = feature_colors[stmt_index];
    switch (feature.geometry.type) {
      case 'Point':
      case 'MultiPoint':
        return {
          fillOpacity: 1,
          color: '#555',
          fillColor: color,
          weight: 2,
        };

      default:
        return {
          weight: 2,
          color,
        };
    }
  }

  function point_to_layer(feature, latlng) {
    return L.circleMarker(latlng, { radius: 4 });
  }

  function quadkey({ x, y, z }) {
    return [...Array(z)]
      .map((_, i) => (x >> i & 1) + (y >> i & 1) * 2)
      .reverse()
      .join('');
  }

});
