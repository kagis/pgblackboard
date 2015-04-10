var closureCompiler = require('closurecompiler');
var autoprefixer    = require('autoprefixer-core');
var csso            = require('csso');
var uglifyjs        = require('uglify-js'); // for codemirror
var rlist           = require('require-list');
var fs              = require('fs');
var path            = require('path');


var requiredDeps = Object.keys((function flatten(modname, deps) {
    var result = {};
    result[modname] = null;
    for (var dep in deps || {}) {
        for (var dep2 in flatten(dep, deps[dep])) {
            result[dep2] = null;
        }
    }
    return result;
})('./src/app.js', rlist('src/app.js')));

requiredDeps = requiredDeps.map(function (modname) {
    if (modname === 'knockout' || modname.lastIndexOf('codemirror', 0) === 0) {
        return 'src/lib/' + modname + '.js';
    }
    return path.relative(__dirname, modname);
});

var libs = {};
requiredDeps.forEach(function (jsFilename) {
    var js = fs.readFileSync(jsFilename).toString();
    var resources = js.split('\n')
        .filter(function (line) { return line.slice(0, 3) === '///'; })
        .map(function (line) { return line.slice(3).trim(); });

    resources.filter(RegExp.prototype.test.bind(/\.js$/))
        .forEach(function (libFileName) { libs[libFileName] = true; });
});

libs = Object.keys(libs);


var jsExterns = [
    'src/lib/knockout.extern.js',
    'src/lib/codemirror.extern.js'
];

var cssFiles = [
    'node_modules/codemirror/lib/codemirror.css',
    'src/main/main.css',
    'src/nav/nav.css',
    'src/tree/tree.css',
    'src/myqueries/myqueries.css',
    'src/splitpanel/splitpanel.css',
    'src/codeform/codeform.css',
    'src/codeform/codemirror/codeeditor.css',
];

task('default',
    ['dist/index.html',
     'dist/bundle-index.js']);

file('dist/index.html',
    ['src/index.html',
     'src/loading-indicator/loading-indicator.min.css'],
    function () {

    var indexHtml = fs.readFileSync('src/index.html').toString();

    // embedding loading indicator styles
    indexHtml = indexHtml.replace(
        '<link href="loading-indicator/loading-indicator.css" rel="stylesheet" />',
        embeddedStyle(fs.readFileSync('src/loading-indicator/loading-indicator.min.css'))
    );

    fs.writeFileSync(this.name, indexHtml);
});

file('dist/app.css', cssFiles, function () {
    jake.logger.log("Processing styles ...");
    fs.writeFileSync(this.name, processCss(
        cssFiles.map(function (cssFileName) {
            var cssSource = readTextFromFile(cssFileName);
            return cssSource.replace(/url\('(\.[^']+)'\)/, function (_, embeddingUrl) {
                embeddingUrl = path.join(path.dirname(cssFileName), embeddingUrl);
                var b64content = fs.readFileSync(embeddingUrl).toString('base64');
                return 'url(data:application/font-woff;base64,' + b64content + ')';
            });
        })
        .join('')));
});

var appjsPrereqs = requiredDeps.concat(jsExterns);
file('dist/app.js', appjsPrereqs, { async: true }, function () {
    jake.logger.log("Compiling JavaScript ...");
    var targetFileName = this.name;
    closureCompiler.compile(requiredDeps, {
        compilation_level: 'ADVANCED_OPTIMIZATIONS',
        warning_level: 'VERBOSE',
        formatting: 'PRETTY_PRINT',
        language_in: 'ECMASCRIPT6_STRICT',
        language_out: 'ECMASCRIPT5_STRICT',
        process_common_js_modules: true,
        common_js_entry_module: 'app.js',
        common_js_module_path_prefix: 'src/lib/',
        output_wrapper: '(function(){%output%})();',

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


file('dist/bundle-index.js',
    ['dist/app.js',
     'dist/app.css']
    .concat(libs),
    function () {

    var bundleOutput = '';
    bundleOutput += documentWrite(embeddedStyle(
        fs.readFileSync('dist/app.css')
          .toString()));
    bundleOutput += libs.map(readTextFromFile).join('\n');
    bundleOutput += readTextFromFile('dist/app.js');
    fs.writeFileSync(this.name, bundleOutput);
});

rule('.min.css', '.css', function () {
    var css = fs.readFileSync(this.source).toString();
    css = autoprefixer.process(css).css;
    css = csso.justDoIt(css);
    fs.writeFileSync(this.name, css);
});

rule('.min.js', '.js', function () {
    var minifiedjs = uglifyjs.minify(this.source).code;
    fs.writeFileSync(this.name, minifiedjs);
});

function processCss(css) {
    css = autoprefixer.process(css).css;
    css = csso.justDoIt(css);
    return css;
}

function readTextFromFile(fileName) {
    return fs.readFileSync(fileName)
             .toString();
}

function embeddedStyle(css) {
    return '<style>' + css + '</style>';
}

function documentWrite(html) {
    return 'document.write("' +
        html.replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"') +
        '");\n';
}


