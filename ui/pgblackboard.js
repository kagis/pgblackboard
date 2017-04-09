[
  ...[
    'codemirror.js',
    'addon/search/searchcursor.js',
    'keymap/sublime.js',
    'addon/edit/matchbrackets.js',
    'addon/edit/closebrackets.js',
    'mode/sql/sql.js',
  ].map(it => 'lib/codemirror/5.25.0/' + it),
  'lib/leaflet/1.0.3/leaflet-src.js',
  'lib/cito.js',
  'amd.js',
  'app.js',
].map(it => `<script src="${it}"></script>`)
.forEach(it => document.write(it));
