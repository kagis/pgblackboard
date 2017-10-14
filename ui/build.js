'use strict';
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const rollup = require('rollup');
const rollup_commonjs = require('rollup-plugin-commonjs');
const rollup_buble = require('rollup-plugin-buble');
const fsp = require('fs-promise');
const postcss = require('postcss');
const postcss_cssnext = require('postcss-cssnext');
const postcss_csso = require('postcss-csso');
const postcss_import = require('postcss-import');
const esprima = require('esprima');

const out_dir = process.env['OUT_DIR'] || 'ui/_dist';

const js_bundle_without_libs
  = rollup.rollup({
    entry: 'ui/app.js',
    plugins: [
      rollup_amd2cjs(),
      rollup_commonjs(),
      rollup_buble({
        transforms: {
          dangerousForOf: true,
        },
      }),
    ],
  })
  .then(bundle => bundle.generate({
    format: 'iife',
    moduleName: '__APP',
  }).code);

const js_libs_bundle
  = Promise.all([
    'ui/lib/codemirror/5.25.0/codemirror.js',
    'ui/lib/codemirror/5.25.0/addon/search/searchcursor.js',
    'ui/lib/codemirror/5.25.0/addon/comment/comment.js',
    'ui/lib/codemirror/5.25.0/keymap/sublime.js',
    'ui/lib/codemirror/5.25.0/addon/edit/matchbrackets.js',
    'ui/lib/codemirror/5.25.0/addon/edit/closebrackets.js',
    'ui/lib/codemirror/5.25.0/mode/sql/sql.js',
    'ui/lib/leaflet/1.0.3/leaflet-src.js',
    'ui/lib/cito.js',
  ].map(filename => fsp.readFile(filename, 'utf-8')))
  .then(it => it.join('\n'));

const js_bundle
  = Promise.all([js_libs_bundle, js_bundle_without_libs])
  .then(it => it.join('\n'));

const postcss_processor = postcss([
  postcss_cssnext,
  postcss_import,
  //postcss_csso,
]);

const css_entry = 'ui/style/app.css';

const css_bundle
  = fsp.readFile(css_entry, 'utf-8')
  .then(css => postcss_processor.process(css, {
    from: css_entry,
  }))
  .then(({ css }) => css);

const html_bundle
  = Promise.all([
    fsp.readFile('ui/index.html', 'utf-8'),
    js_bundle,
    css_bundle,
  ]).then(([index_html, js_bundle_code, css_bundle_code]) => index_html
    .replace(
      '<script src="./pgblackboard.js"></script>',
      '<script>' + js_bundle_code.replace(/\$/g, '$$$$') + '</script>'
    )
    .replace(
      '<link href="./style/app.css" rel="stylesheet" />',
      '<style>' + css_bundle_code.replace(/\$/g, '$$$$') + '</style>'
    )
  );

Promise.all([

  html_bundle.then(gzip).then(data => Promise.all([
    fsp.writeFile(path.join(out_dir, 'index.html.gz'), data),
    fsp.writeFile(path.join(out_dir, 'index.html.gz.md5'), md5(data)),
  ])),

  fsp.readFile('ui/favicon.ico').then(data => Promise.all([
    fsp.writeFile(path.join(out_dir, 'favicon.ico'), data),
    fsp.writeFile(path.join(out_dir, 'favicon.ico.md5'), md5(data)),
  ])),

]).catch(err => {
  console.error(err);
  process.exit(1);
});



function rollup_amd2cjs() {
  return {
    name: 'amd2cjs',
    transform(code, id) {
      const ast = esprima.parse(code, {
        range: true,
        ecmaVersion: 6,
        sourceType: 'module',
      });
      return ast.body.filter(it =>
          it.type == 'ExpressionStatement' &&
          it.expression.type == 'CallExpression' &&
          it.expression.callee.type == 'Identifier' &&
          it.expression.callee.name == 'define' &&
          it.expression.arguments.length == 1 &&
          it.expression.arguments[0].type in {
            'FunctionExpression': true,
            'ArrowFunctionExpression': true,
          }
        ).map(it => it.expression.arguments[0].body.range)
        .map(range => code.slice(range[0] + 1, range[1] - 1))
        .concat([code])[0];
    },
  };
}

function gzip(data) {
  return new Promise((resolve, reject) => zlib.gzip(
    data,
    (err, result) => err ? reject(err) : resolve(result)
  ));
}

function md5(data) {
  return crypto.createHash('md5').update(data).digest('hex');
}
