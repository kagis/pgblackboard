var path = require('path');
var http = require('http');
var connect = require('connect');
var serveStatic = require('serve-static');
var httpProxy = require('http-proxy');

var proxy = httpProxy.createProxyServer({
    target: 'http://localhost:7890'
}).on('error', function (err) {
    console.error(err.toString());
});

var app = connect()
  .use(serveStatic(path.join(__dirname, '.')))
  .use(serveStatic(path.join(__dirname, '..')))
  .use('/', function (req, res) {
    proxy.web(req, res);
  });

http.createServer(app).listen(7891, function () {
  console.log('Listening on http://0.0.0.0:7891');
});
