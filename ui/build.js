var Vulcanize = require('vulcanize');
var htmlMinifier = require('html-minifier');
var HTMLPostCSS = require('html-postcss');
var postcssUrl = require('postcss-url');
var autoprefixer = require('autoprefixer');
var dom5 = require('dom5');
var crypto = require('crypto');
var zlib = require('zlib');
var stream = require('stream');
var path = require('path');
var fs = require('fs');
var Promise = global.Promise || require('es6-promise');

Promise.all([
  buildIndexHtml(dist('index.html')),
  buildErrorHtml(dist('error.html')),
  buildGzippedAppBundle(dist('pgblackboard.js.gz')).then(
    buildEtagFor.bind(null, dist('pgblackboard.js.gz'))
  ),
  copy('ui/favicon.ico', dist('favicon.ico')).then(
    buildEtagFor.bind(null, dist('favicon.ico'))
  )
]).catch(function (err) {
  console.error(err);
  console.error(err.stack);
  process.exit(1);
});

function buildIndexHtml(targetIndexHtmlFile) {
  return Promise.resolve('ui/index.html')
    .then(vulcanize.bind(null, {
      exclude: ['pgblackboard.js']
    }))
    .then(processCssInHtml)
    .then(minifyHtml)
    .then(makeRustTemplate)
    .then(fs.writeFileSync.bind(fs, targetIndexHtmlFile));
}

function buildErrorHtml(targetErrorHtmlFile) {
  return Promise.resolve('ui/error.html')
    .then(vulcanize.bind(null, null))
    .then(processCssInHtml)
    .then(makeRustTemplate)
    .then(fs.writeFileSync.bind(fs, targetErrorHtmlFile));
}

function buildGzippedAppBundle(targetFile) {
  return Promise.resolve('ui/bootstrap.html')
    .then(vulcanize.bind(null, null))
    .then(processCssInHtml)
    .then(minifyHtml)
    .then(retainStylesAndScripts)
    .then(documentWrite)
    .then(writeGzipped.bind(null, targetFile));
}

function buildEtagFor(file) {
  var content = fs.readFileSync(file);
  var hash = crypto.createHash('md5').update(content).digest('hex');
  fs.writeFileSync(file + '.etag', hash);
}

function vulcanize(options, htmlFile) {
  var vulcan = new Vulcanize(options || {
    inlineScripts: true,
    inlineCss: true
  });

  return new Promise(function (resolve, reject) {
    vulcan.process(htmlFile, function (err, inlinedHtml) {
      if (err) {
        return reject(err);
      } else {
        return resolve(inlinedHtml);
      }
    });
  });
}

function processCssInHtml(html) {
  var htmlPostcss = new HTMLPostCSS([
    autoprefixer,
    postcssUrl({ url: 'inline', basePath: 'ui' })
  ]);

  return htmlPostcss.process(html);
}

function minifyHtml(html) {
  return htmlMinifier.minify(html, {
    minifyJS: true,
    minifyCSS: true,
    collapseWhitespace: true,
    conservativeCollapse: true,
    canCollapseWhitespace: function (tag, attrs) {
      return tag == 'script' && attrs.some(function (attr) {
        return attr.name == 'type' && attr.value == "text/html";
      });
    }
  });
}

function makeRustTemplate(html) {
  html = html.replace(/\{/g, '{{').replace(/\}/g, '}}');
  var htmlDoc = dom5.parse(html);
  dom5.queryAll(htmlDoc, dom5.predicates.hasAttr('data-placeholder'))
    .forEach(function (node) {
      var placeholderName = dom5.getAttribute(node, 'data-placeholder');
      dom5.removeAttribute(node, 'data-placeholder');
      dom5.setTextContent(node, '{' + placeholderName + '}');
    });
  return dom5.serialize(htmlDoc);
}

function retainStylesAndScripts(html) {
  var htmlDoc = dom5.parse(html);
  var resultFragment = dom5.constructors.fragment();
  dom5.queryAll(htmlDoc, dom5.predicates.OR(
    dom5.predicates.hasTagName('style'),
    dom5.predicates.hasTagName('script')
  )).forEach(dom5.append.bind(dom5, resultFragment));

  return dom5.serialize(resultFragment);
}

function writeGzipped(file, content) {
  var contentStream = new stream.Readable();
  contentStream._read = function noop() {};
  contentStream.push(content);
  contentStream.push(null);

  return new Promise(function (resolve, reject) {
    contentStream.pipe(zlib.createGzip())
                 .pipe(fs.createWriteStream(file))
                 .on('finish', resolve)
                 .on('error', reject);
  });
}

function documentWrite(html) {
  return 'document.write(' +
    JSON.stringify(html) +
    ');\n';
}

function dist(file) {
  return path.join(process.env.OUT_DIR || 'target/ui', file);
}

function copy(sourceFile, targetFile) {
  return new Promise(function (resolve, reject) {
    fs.createReadStream(sourceFile)
      .pipe(fs.createWriteStream(targetFile))
      .on('finish', resolve)
      .on('error', reject);
  });
}
