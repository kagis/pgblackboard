var map = L.map(document.getElementById('map'), {
    center: [43.260535, 76.945493],
    zoom: 5,
    zoomControl: false,
    attributionControl: false
});


L.control.scale({
    //imperial: false
}).addTo(map);

var bingOptions = {
    subdomains: '01234567',
    quadkey: function (data) {
        var quadKey = '';
        for (var i = data.z; i > 0; i--) {
            var digit = 0;
            var mask = 1 << (i - 1);
            if ((data.x & mask) != 0) {
                digit++;
            }
            if ((data.y & mask) != 0) {
                digit++;
                digit++;
            }
            quadKey += digit;
        }
        return quadKey;
    }
}


var basemap = L.tileLayer(
    'https://{s}.tiles.mapbox.com/v3/exe-dealer.hi8gc0eh/{z}/{x}/{y}.png'
    //'https://www.mapbox.com/v3/base.mapbox-streets+bg-4c4c4c_scale-1_water-0.47x0.47;0.00x0.00;0.05x0.05;0.00x1.00_streets-0.50x0.50;0.00x0.20;0.90x0.00;0.00x1.00_landuse-0.48x0.48;0.00x0.00;0.00x0.40;0.00x1.00_buildings-0.49x0.49;0.00x0.00;0.05x0.45;0.00x1.00/{z}/{x}/{y}.png'
);
var imagery = L.tileLayer('http://ak.dynamic.t{s}.tiles.virtualearth.net/comp/ch/{quadkey}?mkt=en-us&it=A,G,L&shading=hill&og=23&n=z', bingOptions);


var layersControl = L.control.layers({
    'Map': basemap,
    'Imagery': imagery
}, null, {
    collapsed: false
});
map.addControl(layersControl);
map.addLayer(basemap);

var overlays = {};
var overlayOptions = {
    pointToLayer: function (feature, latlng) {
        var marker = L.circleMarker(latlng);
        marker.setRadius(4);
        marker.feature = feature;
        return marker;
    },
    onEachFeature: function (feature, layer) {
        layer.bindPopup(popupHtml(feature));
    },
    style: function (feature) {
        var color = featureColors[feature._overlayKey];
        switch (feature.geometry.type) {
        case 'Point':
        case 'MultiPoint':
            return {
                fillOpacity: 1,
                color: '#333',
                fillColor: color,
            }
        default:
            return {
                weight: 2,
                color: color
            };
        }
    }
};

function addFeatureCollection(overlayKey, featureCollection) {
    featureCollection.features.forEach(function (f) {
        f._overlayKey = overlayKey;
    });
    var overlay = overlays[overlayKey] || addOverlay(overlayKey);
    overlay.addData(featureCollection);
}

function addOverlay(overlayKey) {
    var overlay = L.geoJson(null, overlayOptions);
    overlay.addTo(map);
    overlays[overlayKey] = overlay;
    layersControl.addOverlay(overlay, 'query' + overlayKey);
    return overlay;
}

function popupHtml(feature) {
    var props = feature.properties;
    var propNames = Object.keys(props);
    return '<table class="prop-sheet">' +
        propNames.map(function (propName) {
            return '<tr>' +
                '<td class="prop-name">' + propName + ':</td>' +
                '<td class="prop-value">' + feature.properties[propName] + '</td>' +
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


