import 'https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl-dev.js';

const { maplibregl } = globalThis;
delete globalThis.maplibregl;
export const MaplibreglMap = maplibregl.Map;
export const LngLatBounds = maplibregl.LngLatBounds;
