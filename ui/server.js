var path = require('path');
var http = require('http');
var connect = require('connect');
var serveStatic = require('serve-static');

var app = connect().use(serveStatic(path.join(__dirname, '..')));

http.createServer(app).listen(7890, function () {
  console.log('Listening on http://0.0.0.0:7890');
});
