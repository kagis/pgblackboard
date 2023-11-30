export { createApp } from 'https://unpkg.com/vue@3.3.4/dist/vue.esm-browser.js';
import 'https://unpkg.com/maplibre-gl@2.4.0/dist/maplibre-gl-dev.js';

const { maplibregl } = globalThis;
delete globalThis.maplibregl;
export const MaplibreglMap = maplibregl.Map;
