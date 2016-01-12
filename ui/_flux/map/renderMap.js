'use strict';

csslink('./map.css');

define(function (require, exports, module) {
  const tileCoordsToQuadKey = require('./tileCoordsToQuadKey');
  const featureColors = require('./colors');
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

            featureLayer.bindPopup(cito.vdom.create(renderFeaturePopup(
              row.map((value, index) => ({ name: it.fields[index].name, value }))
                    .filter((_, index) => index != geoJsonFieldIndex)
            )).dom);

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
          color: '#333',
          fillColor: color,
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