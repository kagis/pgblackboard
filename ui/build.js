var Vulcanize = require('vulcanize');
var htmlMinifier = require('html-minifier');
var HTMLPostCSS = require('html-postcss');
var postcssUrl = require("postcss-url");
var autoprefixer = require('autoprefixer');
var crypto = require('crypto');
var zlib = require('zlib');
var stream = require('stream');
var path = require('path');
var fs = require('fs');


buildIndexHtml(dist('index.html'));
buildErrorHtml(dist('error.html'));
buildGzippedAppBundle(dist('pgblackboard.js.gz'));
// buildEtagFor(dist('pgblackboard.js.gz'));
copy('ui/favicon.ico', dist('favicon.ico'));
buildEtagFor(dist('favicon.ico'));

function buildEtagFor(file) {
    var content = fs.readFileSync(file);
    var hash = crypto.createHash('md5').update(content).digest('hex');
    fs.writeFileSync(file + '.etag', hash);
}

function buildErrorHtml(targetErrorHtmlFile) {
    bundleHtml('ui/error.html', function (html) {
      // escape curly braces before injection into html template
      html = html.replace(/\{/g, '{{').replace(/\}/g, '}}')
                 .replace('<!--CODE-PLACEHOLDER-->', '{code}')
                 .replace('<!--PHRASE-PLACEHOLDER-->', '{phrase}')
                 .replace('<!--MESSAGE-PLACEHOLDER-->', '{message}');

      fs.writeFileSync(targetErrorHtmlFile, html);
    });
}

function buildIndexHtml(targetIndexHtmlFile) {
    bundleHtml('ui/loading-indicator.html', function (loadingIndicatorHtml) {
      var indexHtml = fs.readFileSync('ui/index.html').toString();
      indexHtml = indexHtml.replace(
          '<!--LOADING-INDICATOR-PLACEHOLDER-->',
          loadingIndicatorHtml
      );
      fs.writeFileSync(targetIndexHtmlFile, indexHtml);
    });
}

function dist(file) {
    return path.join(process.env.OUT_DIR || 'target/ui', file);
}

function copy(sourceFile, targetFile) {
    fs.writeFileSync(targetFile, fs.readFileSync(sourceFile));
}

function buildGzippedAppBundle(targetBundleFile) {
  var html = bundleHtml('ui/bootstrap.html', function (html) {
    createStringStream(html)
        .pipe(zlib.createGzip())
        .pipe(fs.createWriteStream(targetBundleFile))
        .on('finish', function () {
            buildEtagFor(targetBundleFile);
        });
  });
}

function bundleHtml(sourceHtmlFile, callback) {
    var vulcan = new Vulcanize({
        inlineScripts: true,
        inlineCss: true
    });

    vulcan.process(sourceHtmlFile, function (err, inlinedHtml) {
        if (err) {
            throw err;
        }

        var htmlPostcss = new HTMLPostCSS([
            autoprefixer,
            postcssUrl({ url: 'inline', basePath: 'ui' })
        ]);

        inlinedHtml = htmlPostcss.process(inlinedHtml);

        inlinedHtml = htmlMinifier.minify(inlinedHtml, {
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

        callback(inlinedHtml);
    });
}

function createStringStream(str) {
    var s = new stream.Readable();
    s._read = function noop() {};
    s.push(str);
    s.push(null);
    return s;
}

function documentWrite(html) {
    return 'document.write(' +
        JSON.stringify(html) +
        ');\n';
}
