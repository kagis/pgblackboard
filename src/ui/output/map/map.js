var pgBlackboard = window['pgBlackboard'];

/** @expose */
window.pgBlackboardMap = {};

/** @expose */
window.pgBlackboardMap.beginFeatureCollection = function () {
    latestFeatureCollection = addOverlay(Object.keys(overlays).length + 1);
};

/** @expose */
window.pgBlackboardMap.addFeatures = function (featureCollection) {
    featureCollection['features'].forEach(function (f) {
        f.overlay = latestFeatureCollection;
    });
    latestFeatureCollection.addData(featureCollection);
};

var darkBasemapUrl = 'https://{s}.tiles.mapbox.com/v3/exe-dealer.hi8gc0eh/{z}/{x}/{y}.png';
var lightBasemapUrl = 'https://{s}.tiles.mapbox.com/v3/exe-dealer.joap11pl/{z}/{x}/{y}.png';
var imageryUrl = 'http://ak.dynamic.t{s}.tiles.virtualearth.net/comp/ch/{quadkey}?mkt=en-us&it=A,G,L&shading=hill&og=23&n=z';

var bingOptions = {
    'subdomains': '01234567',
    'quadkey': function (data) {
        var quadKey = '';
        for (var i = data.z; i > 0; i--) {
            var digit = 0;
            var mask = 1 << (i - 1);
            if ((data.x & mask) !== 0) {
                digit++;
            }
            if ((data.y & mask) !== 0) {
                digit++;
                digit++;
            }
            quadKey += digit;
        }
        return quadKey;
    }
};

var latestFeatureCollection;


    var map = L.map(document.getElementsByClassName('main')[0], {
        'center': [
            20, // push antarctida down
            0
        ],
        'zoom': 1,
        'zoomControl': false,
        'attributionControl': false
    });

    L.control.scale().addTo(map);


    var basemap = L.tileLayer();

    function setDarkOrLightBasemap() {
        var isDark = pgBlackboard['isDark']();
        basemap.setUrl(isDark ? darkBasemapUrl : lightBasemapUrl);
    }
    var isDarkSubscription = pgBlackboard['isDark']['subscribe'](setDarkOrLightBasemap);
    window.addEventListener('beforeunload', isDarkSubscription['dispose'].bind(isDarkSubscription));
    setDarkOrLightBasemap();

    var imagery = L.tileLayer(imageryUrl, bingOptions);

    var layersControl = L.control.layers({
        'Map': basemap,
        'Imagery': imagery
    }, null, {
        'collapsed': false
    });
    map.addControl(layersControl);
    map.addLayer(basemap);

    var overlays = {};

    var overlayOptions = {
        'pointToLayer': function (feature, latlng) {
            var marker = L.circleMarker(latlng);
            marker.setRadius(4);
            marker.feature = feature;
            return marker;
        },
        'onEachFeature': function (feature, layer) {
            layer.bindPopup(popupHtml(feature));
        },
        'style': function (feature) {
            var color = feature['properties']['color'] || feature.overlay.options.color;
            switch (feature['geometry']['type']) {
            case 'Point':
            case 'MultiPoint':
                return {
                    'fillOpacity': 1,
                    'color': '#333',
                    'fillColor': color,
                };
            default:
                return {
                    'weight': 2,
                    'color': color
                };
            }
        }
    };



    function addOverlay(overlayKey) {
        var overlay = L.geoJson(null, overlayOptions);
        overlay.options.color = featureColors.pop();
        overlay.addTo(map);
        overlays[overlayKey] = overlay;
        layersControl.addOverlay(overlay, 'query' + overlayKey);
        return overlay;
    }




function popupHtml(feature) {
    var props = feature['properties'];
    var propNames = Object.keys(props);
    return '<table class="prop-sheet">' +
        propNames.map(function (propName) {
            return '<tr>' +
                '<td class="prop-name">' + propName + ':</td>' +
                '<td class="prop-value">' + feature['properties'][propName] + '</td>' +
                '</tr>';
        }).join('') + '</table>';
}

// http://colorbrewer2.org/
var featureColors = [
    // '#ff7f00',
    // '#1f78b4',
    // '#e31a1c',
    // '#33a02c',
    // '#fb9a99',
    // '#fdbf6f',
    // '#b2df8a',
    // '#a6cee3',

    '#a6cee3',
    '#1f78b4',
    '#b2df8a',
    '#33a02c',
    '#fb9a99',
    '#e31a1c',
    '#fdbf6f',
    '#ff7f00',
    '#cab2d6',
    '#6a3d9a',
    '#ffff99',
    '#b15928',
];

