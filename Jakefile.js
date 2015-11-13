var closureCompiler = require('closurecompiler');
var autoprefixer    = require('autoprefixer-core');
var csso            = require('csso');
var fs              = require('fs');
var path            = require('path');
var zlib            = require('zlib');
var crypto          = require('crypto');
var browserify      = require('browserify');

var indexHtmlSrcFileName = 'ui/index.html';
var loadingIndicatorHtmlSrcFileName = 'ui/loading-indicator/loading-indicator.html';
var loadingIndicatorCssFileName = 'ui/loading-indicator/loading-indicator.css';
var faviconSrcFile

function getJsSources(moduleName, jsSources) {
    jsSources = jsSources || {};
    jsSources[moduleName] = true;
    var baseDir = path.dirname(moduleName);
    var pat = /require\('([^']+)'\)/g;
    var moduleContent = fs.readFileSync(path.join(moduleName));
    var match;
    while (match = pat.exec(moduleContent)) {
        var requiredModuleName = match[1];
        if (!path.extname(requiredModuleName)) {
            requiredModuleName += '.js';
        }
        if (requiredModuleName.slice(0, 2) === './' ||
            requiredModuleName.slice(0, 3) === '../')
        {
            requiredModuleName = path.join(baseDir, requiredModuleName);
            getJsSources(requiredModuleName, jsSources)
        } else {
            jsSources[path.join('ui/lib', requiredModuleName)] = true;
        }
    }
    return Object.keys(jsSources);
}

var jsSources = getJsSources('ui/app.js');

var libs = {};
jsSources.forEach(function (jsFilename) {
    var js = fs.readFileSync(jsFilename).toString();
    var resources = js.split('\n')
        .filter(function (line) { return line.slice(0, 3) === '///'; })
        .map(function (line) { return line.slice(3).trim(); });

    resources.filter(RegExp.prototype.test.bind(/\.js$/))
        .forEach(function (libFileName) { libs[libFileName] = true; });
});

libs = Object.keys(libs);


var jsExterns = [
    'ui/lib/knockout.extern.js',
    'ui/lib/codemirror.extern.js',
    'ui/lib/leaflet.extern.js'
];

var cssFiles = [
    'node_modules/codemirror/lib/codemirror.css',
    'ui/components/main/main.css',
    'ui/components/nav/nav.css',
    'ui/components/tree/tree.css',
    'ui/components/myqueries/myqueries.css',
    'ui/components/splitpanel/splitpanel.css',
    'ui/components/codeform/codeform.css',
    'ui/components/codeform/codemirror/codeeditor.css',
];

var outdir = process.env.OUT_DIR || 'target/ui';
var cachedir = path.join(outdir, 'cache');

function dist(filename) {
    return path.join(outdir, filename);
}


task('default', [
    dist('index.html'),
    dist('error.html'),
    dist('pgblackboard.js.gz'),
    dist('pgblackboard.js.etag'),
    dist('favicon.ico'),
    dist('favicon.ico.etag')
]);

file(dist('favicon.ico'), ['ui/favicon.ico'], function () {
    jake.cpR('ui/favicon.ico', this.name);
});

file(dist('index.html'),
    ['ui/index.html',
     'ui/loading-indicator/loading-indicator.html',
     'ui/loading-indicator/loading-indicator.css'],
    function () {
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

        fs.writeFileSync(this.name, indexHtml);
    });

file(dist('error.html'),
    ['ui/error/error.html',
     'ui/error/error.css'],
    function () {
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

        fs.writeFileSync(this.name, errorHtml);
    });

file(dist('pgblackboard.js'),
    [],
    { async: true },
    function (argument) {
        var css = processCssFiles([
            'node_modules/codemirror/lib/codemirror.css',
            'ui/components/main/main.css',
            'ui/components/nav/nav.css',
            'ui/components/tree/tree.css',
            'ui/components/myqueries/myqueries.css',
            'ui/components/splitpanel/splitpanel.css',
            'ui/components/codeform/codeform.css',
            'ui/components/codeform/codemirror/codeeditor.css',
        ]);

        var outputStream = fs.createWriteStream(this.name);
        outputStream.write(documentWrite(embeddedStyle(css)), 'utf-8', function () {
            browserify('ui/app.js')
                .transform('babelify', {
                    presets: ['es2015'],
                    extensions: ['.js', '.html']
                })
                .bundle()
                .pipe(outputStream)
                .on('finish', function () { complete(); });
        });

    });

var appjsPrereqs = jsSources.concat(jsExterns);
file(path.join(cachedir, 'app.js'), appjsPrereqs, { async: true }, function () {
    jake.logger.log("Compiling JavaScript ...");
    var targetFileName = this.name;
    closureCompiler.compile(jsSources, {
        compilation_level: 'ADVANCED_OPTIMIZATIONS',
        warning_level: 'VERBOSE',
        formatting: 'PRETTY_PRINT',
        language_in: 'ECMASCRIPT6_STRICT',
        language_out: 'ECMASCRIPT5_STRICT',
        process_common_js_modules: true,
        common_js_entry_module: 'ui/app.js',
        common_js_module_path_prefix: 'ui/lib/',
        output_wrapper: '(function(){%output%})();',
        export_local_property_definitions: true,
        generate_exports: true,

        // If you specify a directory here, all files inside are used
        externs: jsExterns,
    },
    function (errorsAndWarnings, result) {
        if (result) {
            fs.writeFileSync(targetFileName, result);
            jake.logger.log(errorsAndWarnings);
            complete();
        } else {
            jake.logger.error(errorsAndWarnings);
            fail('Failed to compile JavaScript.');
        }
    });
});

var mapjsPrereqs = [
    'ui/output/map/map.js',
    'ui/lib/leaflet.extern.js'
];

file(path.join(cachedir, 'map.js'), mapjsPrereqs, { async: true }, function () {
    var targetFileName = this.name;
    closureCompiler.compile(['ui/output/map/map.js'], {
        compilation_level: 'ADVANCED_OPTIMIZATIONS',
        warning_level: 'VERBOSE',
        formatting: 'PRETTY_PRINT',
        language_in: 'ECMASCRIPT6_STRICT',
        language_out: 'ECMASCRIPT5_STRICT',
        // process_common_js_modules: true,
        // common_js_entry_module: 'app.js',
        // common_js_module_path_prefix: 'lib/',
        output_wrapper: '(function(){%output%})();',

        // If you specify a directory here, all files inside are used
        externs: ['ui/lib/leaflet.extern.js'],
    },
    function (errorsAndWarnings, result) {
        if (result) {
            fs.writeFileSync(targetFileName, result);
            jake.logger.log(errorsAndWarnings);
            complete();
        } else {
            jake.logger.error(errorsAndWarnings);
            fail('Failed to compile map.js');
        }
    });
});

rule('.gz', '', { async: true }, function () {
    fs.createReadStream(this.source)
        .pipe(zlib.createGzip())
        .pipe(fs.createWriteStream(this.name))
        .on('finish', function () { complete(); });
});

rule('.etag', '', function () {
    var content = fs.readFileSync(this.source);
    var hash = crypto.createHash('md5').update(content).digest('hex');
    fs.writeFileSync(this.name, hash);
});

var indexBundlePrereqs = [
    path.join(cachedir, 'app.js'),
    path.join(cachedir, 'app.css'),
    path.join(cachedir, 'table.css')]
    .concat(libs);

file(path.join(outdir, 'bundle-index.js'), indexBundlePrereqs, function () {
    var bundleOutput = '';
    bundleOutput += documentWrite(embeddedStyle(
        fs.readFileSync(path.join(cachedir, 'app.css'))
          .toString()));
    bundleOutput += libs.map(readTextFromFile).join('\n');
    bundleOutput += '\n';

    bundleOutput += 'window.pgBlackboard=' + JSON.stringify({
        tableCss: readTextFromFile(path.join(cachedir, 'table.css'))
    }) + ';';

    bundleOutput += readTextFromFile(path.join(cachedir, 'app.js'));
    fs.writeFileSync(this.name, bundleOutput);
});

file(path.join(cachedir, 'table.css'),
    ['ui/output/queryplan/queryplan.css',
     'ui/output/table/table.css'],
    processCssTarget);

file(path.join(cachedir, 'loading-indicator.html'),
    ['loading-indicator/loading-indicator.html',
     path.join(cachedir, 'loading-indicator.css')],
    function () {
        var html = String(fs.readFileSync('loading-indicator/loading-indicator.html'));
        var css = String(fs.readFileSync(path.join(cachedir, 'loading-indicator.css')));
        html = html.replace(
            '<link rel="stylesheet" href="./loading-indicator.css" />',
            embeddedStyle(css)
        );
        fs.writeFileSync(this.name, html);
    }
);

file(path.join(cachedir, 'loading-indicator.css'),
    ['ui/loading-indicator/loading-indicator.css'],
    processCssTarget);

file(path.join(outdir, 'bundle-map.js'),
    ['node_modules/leaflet/dist/leaflet.js',
     path.join(cachedir, 'map.js'),
     path.join(cachedir, 'map.css')],
    function () {

    var bundle = '';

    bundle += documentWrite(embeddedStyle(
        readTextFromFile(path.join(cachedir, 'map.css'))
    ));

    bundle += readTextFromFile('node_modules/leaflet/dist/leaflet.js');
    bundle += readTextFromFile(path.join(cachedir, 'map.js'));

    fs.writeFileSync(this.name, bundle);
});

file(path.join(cachedir, 'map.css'),
    ['node_modules/leaflet/dist/leaflet.css',
     'ui/output/map/map.css'],
     processCssTarget);

rule('.min.css', '.css', function () {
    var css = fs.readFileSync(this.source).toString();
    css = autoprefixer.process(css).css;
    css = csso.justDoIt(css);
    fs.writeFileSync(this.name, css);
});

rule('.min.js', '.js', { async: true }, function () {
    var targetFileName = this.name;
    closureCompiler.compile([this.source], {
        compilation_level: 'SIMPLE_OPTIMIZATIONS',
        jscomp_off: 'checkVars'
    },
    function (errorsAndWarnings, result) {
        if (result) {
            fs.writeFileSync(targetFileName, result);
            jake.logger.log(errorsAndWarnings);
            complete();
        } else {
            jake.logger.error(errorsAndWarnings);
            fail('Failed to minify js');
        }
    });
});


function processCssFiles(filenames) {
    var css = filenames.map(readCssFileAndProcessInlinings).join('');
    css = autoprefixer.process(css).css;
    css = csso.justDoIt(css);
    return css;

    function readCssFileAndProcessInlinings(cssFileName) {
        var cssSource = readTextFromFile(cssFileName);
        return cssSource.replace(/url\('(\.[^']+)'\)/, function (_, embeddingUrl) {
            embeddingUrl = path.join(path.dirname(cssFileName), embeddingUrl);
            var b64content = fs.readFileSync(embeddingUrl).toString('base64');
            return 'url(data:application/font-woff;base64,' + b64content + ')';
        });
    }
}

function processCssTarget() {
    fs.writeFileSync(this.name, processCssFiles(this.prereqs));
}

function readTextFromFile(fileName) {
    return fs.readFileSync(fileName)
             .toString();
}

function embeddedStyle(css) {
    return '<style>' + css + '</style>';
}

function documentWrite(html) {
    return 'document.write(' +
        JSON.stringify(html) +
        ');\n';
}

// function indent(size, content) {
//     var indentation = '';
//     while (indentation.length < size) {
//         indentation += ' ';
//     }
//     return content.trim()
//             .split('\n')
//             .map(function (line) { return indentation + line })
//             .join('\n');
// }
