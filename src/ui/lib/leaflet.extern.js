var L = {};

/** @return {L.Map} */
L.map = function () {};

/** @constructor */
L.Map = function () {};
L.Map.prototype.addControl = function () {};
L.Map.prototype.addLayer = function () {};

L.control = {};
L.control.scale = function () {};

/** @return {L.control.Layer} */
L.control.layers = function () {};

/** @constructor */
L.control.Layer = function () {};
L.control.Layer.prototype.addOverlay = function () {};

/** @return {L.CircleMarker} */
L.circleMarker = function () {};

/**
 * @constructor
 * @implements {Layer}
 */
L.CircleMarker = function () {};
L.CircleMarker.prototype.setRadius = function () {};

/** @return {L.TileLayer} */
L.tileLayer = function () {};

/**
 * @constructor
 * @implements {Layer}
 */
L.TileLayer = function () {};

/** @param {string} url */
L.TileLayer.prototype.setUrl = function (url) {};

/** @return {L.GeoJSON} */
L.geoJson = function () {};

/**
 * @constructor
 * @implements {Layer}
 */
L.GeoJSON = function () {};
L.GeoJSON.prototype.addData = function () {};
L.GeoJSON.prototype.geoJson = function () {};

/** @interface */
function Layer() {}
Layer.prototype.bindPopup = function () {};
