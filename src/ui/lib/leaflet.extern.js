var L = {};

/**
 * @param {HTMLElement} containerElem
 * @param {Object} options
 * @return {L.Map}
 */
L.map = function (containerElem, options) {};

/** @constructor */
L.Map = function () {};

/** @param {L.Control} control */
L.Map.prototype.addControl = function (control) {};

/** @param {Layer} layer */
L.Map.prototype.addLayer = function (layer) {};

L.control = {};
L.control.scale = function () {};

/**
 * @param {Object} basemaps
 * @param {Object} overlays
 * @param {Object} options
 * @return {L.Control.Layer}
 */
L.control.layers = function (basemaps, overlays, options) {};

/** @constructor */
L.Control = function () {};

/** @param {L.Map} map */
L.Control.prototype.addTo = function (map) {};

/**
 * @constructor
 * @extends {L.Control}
 */
L.Control.Layer = function () {};

/** @param {Layer} overlay */
L.control.Layer.prototype.addOverlay = function (overlay) {};

/**
 * @param {Object} latlng
 * @return {L.CircleMarker}
 */
L.circleMarker = function (latlng) {};

/**
 * @constructor
 * @extends {Layer}
 */
L.CircleMarker = function () {};

/** @param {number} radius */
L.CircleMarker.prototype.setRadius = function (radius) {};

/**
 * @param {string=} url
 * @param {Object=} options
 * @return {L.TileLayer}
 */
L.tileLayer = function (url, options) {};

/**
 * @constructor
 * @extends {Layer}
 */
L.TileLayer = function () {};

/** @param {string} url */
L.TileLayer.prototype.setUrl = function (url) {};

/**
 * @param {Object} data
 * @param {Object} options
 * @return {L.GeoJSON}
 */
L.geoJson = function (data, options) {};

/**
 * @constructor
 * @extends {Layer}
 */
L.GeoJSON = function () {};
L.GeoJSON.prototype.addData = function () {};
L.GeoJSON.prototype.geoJson = function () {};

/** @constructor */
function Layer() {}

/** @param {*} content */
Layer.prototype.bindPopup = function (content) {};

/** @param {L.Map} map */
Layer.prototype.addTo = function (map) {};

Layer.prototype.options = {};

