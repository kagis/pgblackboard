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

    { debug: "http://knockoutjs.com/downloads/knockout-3.3.0.debug.js",
        min: "http://knockoutjs.com/downloads/knockout-3.3.0.js" },
];

var codeEditor = 'codemirror';

if (codeEditor === 'codemirror') {
    SOURCES = SOURCES.concat([
        "codeform/codemirror/codemirror-adapt.js",
        "codeform/codemirror/codemirror-pgsql.js",
        "codeform/codemirror/codemirror-adapt.css"
    ]);

    LIBS = LIBS.concat([

        { debug: "codemirror.js",
            min: "codemirror.min.js" },

        { debug: "codemirror.css",
            min: "codemirror.min.css" },

        { debug: "addon/search/searchcursor.js",
            min: "addon/search/searchcursor.min.js" },

        { debug: "keymap/sublime.js",
            min: "keymap/sublime.min.js" },

        { debug: "addon/edit/matchbrackets.js",
            min: "addon/edit/matchbrackets.min.js" },

        { debug: "addon/edit/closebrackets.js",
            min: "addon/edit/closebrackets.min.js" },

        { debug: "mode/sql/sql.js",
            min: "mode/sql/sql.min.js" },

    ].map(function (lib) {
        var dir = "http://cdnjs.cloudflare.com/ajax/libs/codemirror/4.12.0/";
        return { debug: dir + lib.debug, min: dir + lib.min };
    }))
}

var libFiles = LIBS.map(function (it) { return it.debug; });
var libJs = libFiles.filter(RegExp.prototype.test.bind(/\.js$/));
var libCss = libFiles.filter(RegExp.prototype.test.bind(/\.css$/));
var jsSources = SOURCES.filter(RegExp.prototype.test.bind(/\.js$/));
var cssSources = SOURCES.filter(RegExp.prototype.test.bind(/\.(css|less)$/));
var htmlSources = SOURCES.filter(RegExp.prototype.test.bind(/\.html$/));

if (typeof document === 'object') {

    libJs.concat(jsSources).forEach(function (url) {
        document.write("<script src='" + url + "'></script>");
    });

    libCss.concat(cssSources).forEach(function (url) {
        document.write("<link href='" + url + "' rel='stylesheet/less' />");
    });

    document.write('<script src="http://cdnjs.cloudflare.com/ajax/libs/less.js/2.4.0/less.js"></script>');

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

        jsLib: LIBS.map(function (it) { return it.debug; })
                    .filter(RegExp.prototype.test.bind(/\.js$/)),

        cssLib: LIBS.map(function (it) { return it.debug; })
                    .filter(RegExp.prototype.test.bind(/\.(css|less)$/))
    };
}
