var path = require('path');
var url = require('url');
var http = require('http');
var connect = require('connect');
var serveStatic = require('serve-static');
var redirect = require('connect-redirection');
var bodyParser = require('body-parser');

var app = connect()
    .use(serveStatic(path.join(__dirname, 'src')))

    .use(redirect())
    .use(bodyParser.urlencoded({ extended: false }))
    .use('/exec', function (req, res, next) {
        switch (req.body.view) {
        case 'Table':
            res.redirect('/output/table/table-demo.html');
            break;
        case 'Map':
            res.redirect('/output/map/map-demo.html');
            break;
        }
    });


http.createServer(app).listen(7890, function () {
    console.log('Listening on http://0.0.0.0:7890');
});
