var SOURCES = [
    "main/main.js",
    "main/main.css",
    "main/main.template.html",

    "codeform/codeform.js",
    "codeform/codeform.less",
    "codeform/codeform.template.html",

    "splitpanel/splitpanel.js",
    "splitpanel/splitpanel.css",
    "splitpanel/splitpanel.template.html",

    "nav/nav.js",
    "nav/nav.less",
    "nav/nav.template.html",

    "nav/myqueries/myqueries.less",
    "nav/myqueries/myqueries.js",
    "nav/myqueries/myqueries.template.html",

    "nav/tree/tree.js",
    "nav/tree/tree.less",
    "nav/tree/tree.template.html",
];

var LIBS = [

    { debug: "node_modules/knockout/build/output/knockout-latest.debug.js",
        min: "node_modules/knockout/build/output/knockout-latest.js" },
];

var codeEditor = 'codemirror';

if (codeEditor === 'codemirror') {
    SOURCES = SOURCES.concat([
        "codeform/codemirror/codemirror-adapt.js",
        "codeform/codemirror/codemirror-pgsql.js",
        "codeform/codemirror/codemirror-adapt.css"
    ]);

    LIBS = LIBS.concat([

        { debug: "node_modules/codemirror/lib/codemirror.js",
            min: "node_modules/codemirror/lib/codemirror.min.js" },

        { debug: "node_modules/codemirror/lib/codemirror.css",
            min: "node_modules/codemirror/lib/codemirror.min.css" },

        { debug: "node_modules/codemirror/addon/search/searchcursor.js",
            min: "node_modules/codemirror/addon/search/searchcursor.min.js" },

        { debug: "node_modules/codemirror/keymap/sublime.js",
            min: "node_modules/codemirror/keymap/sublime.min.js" },

        { debug: "node_modules/codemirror/addon/edit/matchbrackets.js",
            min: "node_modules/codemirror/addon/edit/matchbrackets.min.js" },

        { debug: "node_modules/codemirror/addon/edit/closebrackets.js",
            min: "node_modules/codemirror/addon/edit/closebrackets.min.js" },

        { debug: "node_modules/codemirror/mode/sql/sql.js",
            min: "node_modules/codemirror/mode/sql/sql.min.js" },

    ])
}

var libFiles = LIBS.map(function (it) { return it.debug; });
var libJs = libFiles.filter(RegExp.prototype.test.bind(/\.js$/));
var libCss = libFiles.filter(RegExp.prototype.test.bind(/\.css$/));
var jsSources = SOURCES.filter(RegExp.prototype.test.bind(/\.js$/));
var cssSources = SOURCES.filter(RegExp.prototype.test.bind(/\.(css|less)$/));
var htmlSources = SOURCES.filter(RegExp.prototype.test.bind(/\.html$/));

if (typeof document_ === 'object') {

    libJs.forEach(function (url) {
        document.write("<script src='" + url + "'></script>");
    });

    libCss.forEach(function (url) {
        document.write("<link href='" + url + "' rel='stylesheet' />");
    });

    jsSources.forEach(function (url) {
        document.write("<script src='" + url + "'></script>");
    });

    cssSources.forEach(function (url) {
        document.write("<link href='" + url + "' rel='stylesheet/less' />");
    });

    document.write('<script src="node_modules/less/dist/less.js"></script>');

    htmlSources.forEach(function (url) {
        var req = new XMLHttpRequest();
        req.open('GET', url, false);
        req.send();
        document.write(req.responseText);
    });

    document.write('<script src="demo.js"></script>');
}

if (typeof module === 'object' && module.exports) {
    module.exports = {
        jsSources: jsSources,
        cssSources: cssSources,
        htmlSources: htmlSources,

        jsLib: LIBS.map(function (it) { return it.min; })
                    .filter(RegExp.prototype.test.bind(/\.js$/)),

        cssLib: LIBS.map(function (it) { return it.min; })
                    .filter(RegExp.prototype.test.bind(/\.(css|less)$/))
    };
}

document.write(`


    <link href="http://cdnjs.cloudflare.com/ajax/libs/codemirror/5.0.0/codemirror.css" rel="stylesheet" />
    <link href="codeform/codemirror/codemirror-adapt.css" rel="stylesheet" />

    <link href="main/main.css" rel="stylesheet" />
    <link href="codeform/codeform.css" rel="stylesheet/less" />
    <link href="splitpanel/splitpanel.css" rel="stylesheet/less" />
    <link href="nav/nav.css" rel="stylesheet" />
    <link href="myqueries/myqueries.less" rel="stylesheet/less" />
    <link href="tree/tree.less" rel="stylesheet/less" />

    <script src="https://cdnjs.cloudflare.com/ajax/libs/less.js/2.4.0/less.js"></script>


    <script src="https://rawgit.com/ModuleLoader/es6-module-loader/master/dist/es6-module-loader.src.js"></script>
    <script src="https://rawgit.com/systemjs/systemjs/master/dist/system.src.js"></script>
    <script>
        System.config({
          "paths": {
            "*.html": "*.html",
            "knockout": "https://cdnjs.cloudflare.com/ajax/libs/knockout/3.3.0/knockout-debug.js",
            "codemirror": "http://cdnjs.cloudflare.com/ajax/libs/codemirror/5.0.0/codemirror.js",
            "codemirror/*": "http://cdnjs.cloudflare.com/ajax/libs/codemirror/5.0.0/*.js",
          },
          "map": {
            "root-bindingctx": "demo",
            "codemirror/lib/codemirror": "codemirror"
          },
        });
        System.import("app");
    </script>

`);
