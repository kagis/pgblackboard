const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const rollup = require('rollup');
const rollup_buble = require('rollup-plugin-buble');
const postcss = require('postcss');
const postcss_cssnext = require('postcss-cssnext');
const postcss_import = require('postcss-import');
const fs = require('fs');

const read_file = (...args) => new Promise((resolve, reject) => fs.readFile(...args, (err, data) => {
  if (err) {
    return reject(err);
  }
  return resolve(data);
}));
const write_file = (...args) => new Promise((resolve, reject) => fs.writeFile(...args, (err, data) => {
  if (err) {
    return reject(err);
  }
  return resolve(data);
}));

const out_dir = process.env['OUT_DIR'] || 'ui/_dist';

const js_bundle
  = rollup.rollup({
    input: 'ui/main.js',
    plugins: [
      rollup_buble({
        objectAssign: 'Object.assign',
        transforms: {
          dangerousForOf: true,
        },
      }),
    ],
  })
  .then(bundle => bundle.generate({
    format: 'iife',
    name: 'pgblackboard',
  }))
  .then(({ code }) => code);


const postcss_processor = postcss([
  postcss_cssnext,
  postcss_import,
]);

const css_entry = 'ui/style/app.css';

const css_bundle
  = read_file(css_entry, 'utf-8')
  .then(css => postcss_processor.process(css, {
    from: css_entry,
  }))
  .then(({ css }) => css);

const html_bundle
  = Promise.all([
    read_file('ui/index.html', 'utf-8'),
    js_bundle,
    css_bundle,
  ]).then(([index_html, js_bundle_code, css_bundle_code]) => index_html
    .replace(
      '<script type="module" src="main.js"></script>',
      '<script>' + js_bundle_code.replace(/\$/g, '$$$$') + '</script>'
    )
    .replace(
      '<link href="./style/app.css" rel="stylesheet" />',
      '<style>' + css_bundle_code.replace(/\$/g, '$$$$') + '</style>'
    )
  );

Promise.all([

  html_bundle.then(gzip).then(data => Promise.all([
    write_file(path.join(out_dir, 'index.html.gz'), data),
    write_file(path.join(out_dir, 'index.html.gz.md5'), md5(data)),
  ])),

  read_file('ui/favicon.ico').then(data => Promise.all([
    write_file(path.join(out_dir, 'favicon.ico'), data),
    write_file(path.join(out_dir, 'favicon.ico.md5'), md5(data)),
  ])),

]).catch(err => {
  console.error(err);
  process.exit(1);
});


function gzip(data) {
  return new Promise((resolve, reject) => zlib.gzip(
    data,
    (err, result) => err ? reject(err) : resolve(result)
  ));
}

function md5(data) {
  return crypto.createHash('md5').update(data).digest('hex');
}
