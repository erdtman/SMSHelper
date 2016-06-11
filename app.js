'use strict';

var express = require('express');
var routes = require('./routes');
var http = require('http');
var path = require('path');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var serveStatic = require('serve-static');
var methodOverride = require('method-override');
var errorhandler = require('errorhandler');
var multer  = require('multer')

var storage = multer.memoryStorage();
var upload = multer({ storage: storage });


var app = express();

let db = require('./db.js');

let url = process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'mongodb://localhost:27017/my_database_name';
let port = process.env.PORT || 8080;

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
app.get('/result/:channel/result.xlsx', routes.download);
app.post('/resend/:channel', routes.resend);
app.post('/send', upload.single('members'), routes.send);

http.createServer(app).listen(app.get('port'), function() {
  console.log('Express server listening on port ' + app.get('port'));
});


db.connect(url, function(err) {
  if (err) {
    console.log('Unable to connect to Mongo.');
  } else {
    console.log('Connection established to', url);
  }
});
