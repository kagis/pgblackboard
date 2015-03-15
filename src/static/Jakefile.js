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
})('./app.js', requireList('./app.js')));



task('default', ['dist/index.html', 'dist/bundle-index.js'], function () {

});

file('dist/index.html', ['loader/loader.min.css'], function () {
    var indexHtml = fs.readFileSync('index.html').toString();

    // embeding loader styles
    indexHtml = indexHtml.replace(
        '<link href="loader/loader.css" rel="stylesheet" />',
        '<style>' + fs.readFileSync('loader/loader.min.css') + '</style>');



    fs.writeFileSync(this.name, indexHtml);
});


file('dist/bundle-index.js', requireFlat, function () {
    // var js = bundleIndex.jsLib
    //     .map(function (filename) { return fs.readFileSync(filename).toString(); })
    //     .join('');

    fs.writeFileSync(this.name, js);
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
