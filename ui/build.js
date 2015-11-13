var Builder = require('systemjs-builder');
var fromFileURL = require('systemjs-builder/lib/utils').fromFileURL;
var autoprefixer = require('autoprefixer-core');
var csso = require('csso');
var path = require('path');
var fs = require('fs');
var stream = require('stream');
var zlib = require('zlib');
var crypto = require('crypto');

var Vulcanize = require('vulcanize');
var htmlMinifier = require('html-minifier');
var HTMLPostCSS = require('html-postcss');
var postcssUrl = require("postcss-url");


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
    var errorHtml = String(fs.readFileSync('ui/error/error.html'));
    var errorCss = processCssFiles(['ui/error/error.css']);

    // escape curly braces before injection into html template
    var escapedErrorCss = errorCss.replace(/\{/g, '{{').replace(/\}/g, '}}');

    // embedding styles
    errorHtml = errorHtml.replace(
        '<link rel="stylesheet" href="err.css" />',
        embeddedStyle(escapedErrorCss)
    );

    // removing whitespaces between tags
    errorHtml = errorHtml.replace(/\>\s+\</g, '><');

    fs.writeFileSync(targetErrorHtmlFile, errorHtml);
}

function buildIndexHtml(targetIndexHtmlFile) {
    var loadingIndicatorCss = processCssFiles([
        'ui/loading-indicator/loading-indicator.css'
    ]);

    var loadingIndicatorHtml = String(fs.readFileSync(
        'ui/loading-indicator/loading-indicator.html'
    ));

    var indexHtml = String(fs.readFileSync('ui/index.html'));

    // embedding loading indicator styles
    loadingIndicatorHtml = loadingIndicatorHtml.replace(
        '<link rel="stylesheet" href="./loading-indicator.css" />',
        embeddedStyle(loadingIndicatorCss)
    );

    indexHtml = indexHtml.replace(
        '<!--LOADING-INDICATOR-PLACEHOLDER-->',
        loadingIndicatorHtml
    );

    // removing whitespaces between tags
    indexHtml = indexHtml.replace(/\>\s+\</g, '><');

    fs.writeFileSync(targetIndexHtmlFile, indexHtml);
}

function dist(file) {
    return path.join(process.env.OUT_DIR || 'target/ui', file);
}

function copy(sourceFile, targetFile) {
    fs.writeFileSync(targetFile, fs.readFileSync(sourceFile));
}



function buildGzippedAppBundle(targetBundleFile) {
    var vulcan = new Vulcanize({
        // stripExcludes: ['template-module.html']
        inlineScripts: true,
        inlineCss: true
    });

    vulcan.process('ui/bootstrap.html', function (err, inlinedHtml) {
        if (err) {
            return console.error(err);
        }

        //inlinedHtml = htmlAutoprefixer.process(inlinedHtml);

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

        var resultBundle = documentWrite(inlinedHtml);

        createStringStream(resultBundle)
            .pipe(zlib.createGzip())
            .pipe(fs.createWriteStream(targetBundleFile))
            .on('finish', function () {
                buildEtagFor(targetBundleFile);
            });

        // fs.writeFileSync(targetBundleFile, 'document.write(' + JSON.stringify(inlinedHtml) + ');');
    });
}

function buildGzippedAppBundle_(targetBundleFile) {
    var builder = new Builder({
        map: {

        },
        paths: {
            'knockout': 'node_modules/knockout/build/output/knockout-latest.js',
            'codemirror': 'node_modules/codemirror/lib/codemirror.js',
            'codemirror/*': 'node_modules/codemirror/*.js',
            'node_modules/codemirror/lib/codemirror': 'node_modules/codemirror/lib/codemirror.js',
            'node_modules/codemirror/*': 'node_modules/codemirror/*.js'
        },
        meta: {
            'codemirror': {
                format: 'global'
            }
        }
    });

    builder.fetch = function (load, fetch) {
        if (path.extname(load.name) == '.html') {
            return getHtmlTemplateModuleSource(
                path.relative(__dirname, fromFileURL(load.name))
            );
        }
        return fetch(load);
    };

    return builder.trace('ui/app.js').then(function (modules) {
        console.log(modules)
        var htmlFiles = Object.keys(modules).filter(extfilter('.html'));
        var htmlBundle = htmlFiles.map(makeHtmlTemplateScript).join('');
        var cssFiles = distinct(htmlFiles.map(htmlFileLinks).reduce(flatten));
        var cssBundle = embeddedStyle(processCssFiles(cssFiles));
        return builder.buildStatic('ui/app.js').then(function (jsBuildOutput) {
            var resultBundle =
                documentWrite(cssBundle + htmlBundle) +
                jsBuildOutput.source;

            createStringStream(resultBundle)
                .pipe(zlib.createGzip())
                .pipe(fs.createWriteStream(targetBundleFile))
                .on('finish', function () {
                    buildEtagFor(targetBundleFile);
                });

        });
    });
}

function createStringStream(str) {
    var s = new stream.Readable();
    s._read = function noop() {};
    s.push(str);
    s.push(null);
    return s;
}


function processCssFiles(cssFiles) {
    var css = cssFiles.map(readCssFileAndProcessInlinings).join('');
    css = autoprefixer.process(css).css;
    css = csso.justDoIt(css);
    return css;

    function readCssFileAndProcessInlinings(cssFile) {
        var cssSource = fs.readFileSync(cssFile).toString();
        return cssSource.replace(/url\('(\.[^']+)'\)/, function (_, embeddingUrl) {
            embeddingUrl = path.join(path.dirname(cssFile), embeddingUrl);
            var b64content = fs.readFileSync(embeddingUrl).toString('base64');
            return 'url(data:application/font-woff;base64,' + b64content + ')';
        });
    }
}

function getHtmlTemplateModuleSource(htmlFile) {
    return 'module.exports=' + JSON.stringify({
        element: htmlFile
    });
}

function makeHtmlTemplateScript(htmlFile) {
    return '<script type="text/html" id="' + htmlFile + '">' +
           fs.readFileSync(htmlFile).toString() +
           '</script>';
}

function htmlFileLinks(htmlFile) {
    var base = path.dirname(htmlFile);
    var html = fs.readFileSync(htmlFile).toString();
    return (html.match(/<link.*?\/>/g) || [])
        .map(function (linkHtml) { return /href=\"([^\"]*)/.exec(linkHtml)[1]; })
        .map(function (href) { return path.join(base, href); });
}

function flatten(a, b) {
    return a.concat(b);
}

function distinct(sourceArray) {
    return Object.keys(sourceArray.reduce(function (set, it) {
        return set[it] = true, set;
    }, {}));
}

function extfilter(ext) {
    return function (file) {
        return path.extname(file) == ext;
    }
}

function embeddedStyle(css) {
    return '<style>' + css + '</style>';
}

function documentWrite(html) {
    return 'document.write(' +
        JSON.stringify(html) +
        ');\n';
}
