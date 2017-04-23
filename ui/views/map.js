define(function (require, exports, module) {
  'use strict';
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
      return void update_map(node.map, params);
    }
    return {
      tag: 'map',
      attrs: { class: 'map_container' },
      events: {
        $created({ target, virtualNode }) {
          const map = create_map(target);
          update_map(map, params);
          virtualNode.map = map;
        },
      },
    };
  }

  function create_map(container_el) {
    const map = L.map(container_el, {
      center: [20 /* push antarctida down */, 0],
      zoom: 1,
      zoomControl: false,
      attributionControl: false,
      preferCanvas: true,
    }).addControl(L.control.scale());

    const baselayers = baselayers_conf.map(conf => L.tileLayer(
      conf.url_tmpl, 
      Object.assign({}, conf, {
        quadkey,
        detectRetina: true,
        theme: _ => conf.theme_map.light,
      })
    ));

    const layers_ctl = L.control.layers(null, null, {
      collapsed: false
    });
    for (let it of baselayers) {
      layers_ctl.addBaseLayer(it, it.options.name);
    }
    map.addControl(layers_ctl);
    map.addLayer(baselayers[0]);

    const overlays_group = L.layerGroup().addTo(map);

    window.map = map;
    
    return {
      map,
      baselayers,
      overlays_group,
      layers_ctl,
    };
  }

  function update_map({ overlays_group, layers_ctl }, { stmt_results, is_dark }) {
    // map.baseLayers
    //   .filter(it => it.options.isDark !== is_dark)
    //   .forEach(it => {
    //     L.setOptions(it, { isDark: is_dark });
    //     it.redraw();
    //   });

    overlays_group.eachLayer(layer => layers_ctl.removeLayer(layer));
    overlays_group.clearLayers();

    for (let [stmt_index, { fields, rows, src_table }] of stmt_results.entries()) {
      if (!fields || !rows) {
        return;
      }
      const geom_field_idx
        = fields
        .map(({ name }) => name)
        .indexOf('st_asgeojson');

      if (geom_field_idx < 0) {
        continue;
      }
      const color = feature_colors[stmt_index];
      const overlay_options = {
        style: compute_feature_style.bind(null, { color: color }),
        pointToLayer,

      };
      const overlay = L.featureGroup(rows.map(row => L.geoJson({
        type: 'Feature',
        geometry: JSON.parse(row[geom_field_idx]),
        properties: { row },
      }, overlay_options)));

      overlay.bindPopup(({ feature: { properties: { row }}}) => cito.vdom.create(render_map_popup(
        row.map((value, index) => ({ name: fields[index].name, value }))
              .filter((_, index) => index != geom_field_idx)
      )).dom);

      layers_ctl.addOverlay(overlay, src_table && src_table.table_name || String(stmt_index + 1))
      overlays_group.addLayer(overlay);
    }
  }

  function compute_feature_style(options, feature) {
    const color = feature['properties']['color'] || options.color;
    switch (feature['geometry']['type']) {
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

  function pointToLayer(feature, latlng) {
    return L.circleMarker(latlng, {
      radius: 4,
      feature,
    });
  }

  const quadkey = ({ x, y, z }) => [...Array(z)]
    .map((_, i) => (x >> i & 1) + (y >> i & 1) * 2)
    .reverse()
    .join('');

});
