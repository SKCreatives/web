/*global */

// Session GC on timeout
// function sessionCleanup() {
//     sessionStore.all(function(n, s) {
//         for (var i = 0; i < s.length; i++)
//             sessionStore.get(s[i], function() {} );
//     }
// }

var http    = require('http');
var path    = require('path');
var express = require('express');
var lessMW  = require('less-middleware');
var args    = require('commander');

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
app.use(express.favicon(__dirname + '/public/favicon.ico'));
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



// Redirect www to no-www

app.all('/*', function(req, res, next) {
  if (req.headers.host.match(/^www/) !== null ) {
    res.redirect(301, 'http://' + req.headers.host.replace(/^www\./, '') + req.url);
  } else {
    next();     
  }
});



// Routing

var routes = require('./routes');

app.get('/', routes.index);



// Start server
http.createServer(app)
  .listen(app.get('port'), function(){
    console.log("Express server listening on port " + app.get('port'));
  });


