var fs = require('fs'),
    autoprefixer = require('autoprefixer-core'),
    csso = require('csso'),
    uglifyJs = require('uglify-js');


var requireList = require('require-list');
var requireFlat = Object.keys((function flatten(modname, deps) {
    var result = {};
    result[modname] = null;
    for (var dep in deps || {}) {
        for (var dep2 in flatten(dep, deps[dep])) {
            result[dep2] = null;
        }
    }
    return result;
})('./src/app.js', requireList('src/app.js')));

var path = require('path');
requireFlat = requireFlat.map(function (modname) {
    if (modname === 'knockout' || modname.lastIndexOf('codemirror', 0) === 0) {
        return 'src/lib/' + modname + '.js';
    }
    return path.relative(__dirname, modname);
});



task('default', ['dist/index.html', 'dist/bundle-index.js'], function () {

});

file('dist/index.html', ['src/load-indicator/load-indicator.min.css'], function () {
    var indexHtml = fs.readFileSync('index.html').toString();

    // embeding load indicator styles
    indexHtml = indexHtml.replace(
        '<link href="load-indicator/load-indicator.css" rel="stylesheet" />',
        '<style>' + fs.readFileSync('src/load-indicator/load-indicator.min.css') + '</style>');



    fs.writeFileSync(this.name, indexHtml);
});


file('dist/bundle-index.js', requireFlat, { async: true }, function () {
    var targetFileName = this.name;
    var closureCompiler = require('closurecompiler');

    closureCompiler.compile(requireFlat, {
        compilation_level: 'ADVANCED_OPTIMIZATIONS', //'SIMPLE_OPTIMIZATIONS',
        formatting: 'PRETTY_PRINT',
        language_in: 'ECMASCRIPT6_STRICT',
        language_out: 'ECMASCRIPT5_STRICT',
        process_common_js_modules: true,
        common_js_entry_module: 'app.js',
        common_js_module_path_prefix: 'src/lib/',


        // If you specify a directory here, all files inside are used
        //externs: ["externs/file3.js", "externs/contrib/"],

        // ^ As you've seen, multiple options with the same name are
        //   specified using an array.

    },
    function (error, result) {
        if (result) {
            fs.writeFileSync(targetFileName, result);
            complete();
        } else {
            console.error(error);
         }
    }
);

    // var js = bundleIndex.jsLib
    //     .map(function (filename) { return fs.readFileSync(filename).toString(); })
    //     .join('');

});

rule('.min.css', '.css', function () {
    var css;
    css = fs.readFileSync(this.source).toString();
    css = autoprefixer.process(css).css;
    css = csso.justDoIt(css);
    fs.writeFileSync(this.name, css);
});

rule('.min.js', '.js', function () {
    var minifiedJs = uglifyJs.minify(this.source)
    fs.writeFileSync(this.name, minifiedJs);
});


function processCss(css) {
    css = autoprefixer.process(css).css;
    css = csso.justDoIt(css);
    return css;
}



console.log(requireFlat)
