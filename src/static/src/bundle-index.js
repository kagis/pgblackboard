document.write(`
    <link href="http://cdnjs.cloudflare.com/ajax/libs/codemirror/5.0.0/codemirror.css" rel="stylesheet" />
    <link href="codeform/codemirror/codeeditor.css" rel="stylesheet" />

    <link href="main/main.css" rel="stylesheet" />
    <link href="codeform/codeform.css" rel="stylesheet" />
    <link href="splitpanel/splitpanel.css" rel="stylesheet" />
    <link href="nav/nav.css" rel="stylesheet" />
    <link href="myqueries/myqueries.css" rel="stylesheet" />
    <link href="tree/tree.css" rel="stylesheet" />

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
    System.load("app");
    </script>
`);
