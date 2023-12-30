#!/bin/sh
set -ex
cd ui/_lib
curl \
  -o vue.js                  'https://unpkg.com/vue@3.4.2/dist/vue.esm-browser.js' \
  -o maplibre.css            'https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css' \
  -o maplibre.js             'https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl-dev.js' \
  -o monaco.css              'https://esm.sh/v135/monaco-editor@0.45.0/es2022/monaco-editor.development.css' \
  -o monaco.js               'https://esm.sh/v135/monaco-editor@0.45.0/es2022/esm/vs/editor/editor.main.development.bundle.js' \
  -o monaco_editor_worker.js 'https://esm.sh/v135/monaco-editor@0.45.0/es2022/esm/vs/editor/editor.worker.development.bundle.js?worker' \
  -o monaco_json_worker.js   'https://esm.sh/v135/monaco-editor@0.45.0/es2022/esm/vs/language/json/json.worker.development.bundle.js?worker' \
;

#TODO roboto
