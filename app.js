/*global */

var http    = require('http');
var path    = require('path');
var express = require('express');
var lessMW  = require('less-middleware');
var args    = require('commander');
var favicons = require('connect-favicons');
var chromeframe = require('connect-chromeframe');
var nowww = require('connect-no-www');

express.statik = express.static;

// App

var app = module.exports = express();



// Mode
var dev = false;
if (app.get('env') === 'development') dev = true;



// Shared

app.locals.siteName = 'Sidekick';



// Commander

args
  .version('0.0.1')
  .option('-p, --port <port>',          'specify the port [11690]',           Number, 11690)
  .option('-t, --ptitle <Proc_Title>',  'specify the process title [myapp]',  String, 'sidekickcreatives.com(live)')
  .parse(process.argv);




// Configuration

process.title = args.ptitle;

app.set('port', args.port);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');


// Middleware
app.use(nowww());
app.use(favicons(__dirname + '/public/img'));
app.use(chromeframe());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser('your secret here'));
app.use(express.session());
app.use(app.router);
app.use(function (req, res, next) {
  if (req.path.match(/^.*\.less/gi)) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Credentials', true);
    res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header("Content-type", "text/less");
  }
  next();
});
app.use(lessMW({ src: __dirname + '/public' }));
app.use(express.directory(path.join(__dirname, 'public'), { icons:true }));
app.use(express.statik(path.join(__dirname, 'public')));
app.use(function (err, req, res, next) {
  if (err) res.render('404', {
      status: 404
    , err: err
    , req: req
  });
});


// Set environment

if (app.get('env') === 'development') {
  app.use(express.errorHandler({
    dumpExceptions: true,
    showStack: true
  }));
}



// Routing

var routes = require('./routes');

app.get('/', routes.index);
app.get('/submissions', routes.submissions);



// Start server
http.createServer(app)
  .listen(app.get('port'), function(){
    console.log("Express server listening on port " + app.get('port'));
  });


