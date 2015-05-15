/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var http = require('http');
var path = require('path');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var serveStatic = require('serve-static');
var methodOverride = require('method-override');
var errorhandler = require('errorhandler');
var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(morgan('combined'));
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(methodOverride('X-HTTP-Method-Override'))
app.use(serveStatic(__dirname + '/public'))


// development only
if ('development' == app.get('env')) {
  app.use(errorhandler());
}
//app.use(app.router);

app.get('/', routes.index);
app.get('/result/:channel', routes.result);
app.post('/result/:channel', routes.sms);
app.post('/resend/:channel', routes.resend);
app.post('/send', routes.send);

http.createServer(app).listen(app.get('port'), function() {
  console.log('Express server listening on port ' + app.get('port'));
});
