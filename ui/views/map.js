
define(function (require, exports, module) {
  'use strict';
  const L = window.L;
  
  const featureColors = [
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

  const renderFeaturePopup = require('./featurePopup/renderFeaturePopup');

  module.exports = renderMap;

  function renderMap(params) {
    return function createOrUpdateMapNode(oldNode) {
      if (oldNode && oldNode.map) {
        updateMap(oldNode.map, params);
      } else {
        return {
          tag: 'map',
          attrs: {
            class: 'mapContainer'
          },
          events: {
            $created: function (e) {
              const map = createMap(e.target);
              updateMap(map, params);
              e.virtualNode.map = map;
            }
          }
        };
      }
    };
  }

  function createMap(containerEl) {
    const map = L.map(containerEl, {
      center: [20 /* push antarctida down */, 0],
      zoom: 1,
      zoomControl: false,
      attributionControl: false,
      preferCanvas: true,
    });

    L.control.scale().addTo(map);

    const baseLayers = [
      withOptions(createMapBoxLayer(), { name: 'Map' }),
      withOptions(createBingLayer(), { name: 'Imagery' })
    ];

    const layersControl = L.control.layers(null, null, {
      collapsed: false
    });

    baseLayers.forEach(it => {
      layersControl.addBaseLayer(it, it.options.name);
    });

    map.addControl(layersControl);

    map.addLayer(baseLayers[0]);

    const overlaysLayer = L.featureGroup();
    map.addLayer(overlaysLayer);

    Object.assign(map, {
      overlaysLayer,
      layersControl,
      baseLayers,
    });

    window.map = map;
    return map;
  }

  function updateMap(map, params) {
    map.baseLayers
      .filter(it => it.options.isDark !== params.isDark)
      .forEach(it => {
        L.setOptions(it, { isDark: params.isDark });
        it.redraw();
      });

    map.overlaysLayer.eachLayer(layer => {
      map.layersControl.removeLayer(layer);
    });

    map.overlaysLayer.clearLayers();

    params.items
      .filter(it => it.resultType == 'ROWSET')
      .forEach((it, resultIndex) => {
        const geoJsonFieldIndex = it.fields.findIndex(
          field => field.is_geojson
        );
        if (!(geoJsonFieldIndex < 0)) {
          const color = featureColors[resultIndex];
          const overlayOptions = {
            style: computeFeatureStyle.bind(null, { color: color }),
            pointToLayer,

          };
          const overlay = L.featureGroup(it.rows.map(row => {
            const featureLayer = L.geoJson(
              JSON.parse(row[geoJsonFieldIndex]),
              overlayOptions
            );

            featureLayer.bindPopup(function () {
              return cito.vdom.create(renderFeaturePopup(
                row.map((value, index) => ({ name: it.fields[index].name, value }))
                      .filter((_, index) => index != geoJsonFieldIndex)
              )).dom;
            });

            return featureLayer;
          }));
          map.layersControl.addOverlay(overlay, String(resultIndex + 1))
          map.overlaysLayer.addLayer(overlay);
        }
      });

  }

  function createBingLayer() {
    return L.tileLayer('http://ak.dynamic.t{s}.tiles.virtualearth.net/comp/ch/{quadkey}?mkt=en-us&it=A,G,L&shading=hill&og=23&n=z', {
      subdomains: '01234567',
      'quadkey': tileCoordsToQuadKey
    });
  }

  function createMapBoxLayer() {
    return L.tileLayer('https://{s}.tiles.mapbox.com/v3/exe-dealer.{id}/{z}/{x}/{y}.png', {
      darkId: 'hi8gc0eh',
      lightId: 'joap11pl',
      isDark: false,
      id(data) { return data.isDark ? data.darkId : data.lightId; }
    });
  }

  var overlays = {};

  function computeFeatureStyle(options, feature) {
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
          color: color,
        };
    }
  }

  function pointToLayer(feature, latlng) {
    return L.circleMarker(latlng, {
      radius: 4,
      feature: feature,
    });
  }

  // var overlayCommonOptions = {
  //   pointToLayer(feature, latlng) {
  //     return L.circleMarker(latlng, {
  //       radius: 4,
  //       feature: feature,
  //     });
  //   },
  //   onEachFeaturefunction(feature, layer) {
  //     // layer.bindPopup(popupHtml(feature));
  //   },
  //   style(feature) {
  //
  //   }
  // };

  function addOverlay(overlayKey) {
    var overlay = L.geoJson(null, overlayOptions);
    overlay.options.color = featureColors.pop();
    overlay.addTo(map);
    overlays[overlayKey] = overlay;
    layersControl.addOverlay(overlay, 'query' + overlayKey);
    return overlay;
  }

  function withOptions(obj, options) {
    L.setOptions(obj, options);
    return obj;
  }


  function quadkey({ x, y, z }) {
    let result = '';
    for (let i = z; i > 0; i--) {
      const mask = 1 << (i - 1);
      result += (x & mask ? 1 : 0) + (y & mask ? 2 : 0);
    }
    return quadKey;
  }

// var pgBlackboardOutput = window['pgBlackboardOutput'];
//
// /** @expose */
// pgBlackboardOutput.beginFeatureCollection = function () {
//   latestFeatureCollection = addOverlay(Object.keys(overlays).length + 1);
// };
//
// /** @expose */
// pgBlackboardOutput.addFeatures = function (featureCollection) {
//   featureCollection['features'].forEach(function (f) {
//     f.overlay = latestFeatureCollection;
//   });
//   latestFeatureCollection.addData(featureCollection);
// };

var latestFeatureCollection;






});
