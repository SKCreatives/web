var os           = require('os');
var fs           = require('fs');
var path         = require('path');
var express      = require('express');
var connect      = require('connect');
var jade         = require('jade');
var lessCSS      = require('less-middleware');
var marked       = require('marked');
var yaml         = require('js-yaml');
var async        = require('async');
var colors       = require('colors');
var favicons     = require('connect-favicons');
var nowww        = require('connect-no-www');
var cheerio      = require('cheerio');
var _            = require('lodash');
var config       = require('config');
var appPackage   = require('./package.json');
var scraper      = require('./lib/Scraper.js');

var app = module.exports  = express();

app.locals.marked = marked;


// Config
_.extend(app.settings, config);

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
_(app.locals).extend({
  pretty: (app.get('env') === 'development'),
  basedir: __dirname
});



// Middleware
app.use(nowww());
app.use(favicons(__dirname + '/public/img/icons'));
app.use(express.logger('dev'));
app.use(connect.urlencoded());
app.use(connect.json());
app.use(express.methodOverride());
app.use(express.cookieParser('skyfall'));
app.use(express.session());
app.use(app.router);
app.use(lessCSS({ src: __dirname + '/public' }));
app.use(express.directory(path.join(__dirname, 'public'), { icons:true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));





// Load all projects and site data
var dataDir = __dirname + '/data';
var dataFiles = fs.readdirSync(dataDir);

var projects = app.locals.projects = (function() {
  var buf = fs.readFileSync(dataDir + '/projects.yaml', 'utf8');
  var docs = [];
  yaml.loadAll(buf, function (doc) {
    docs.push(doc);
  });
  return docs;
}());

var site = app.locals.site = [];

scraper = scraper({ projects: projects });
scraper.start();





// Routing
app.get('/', function(req, res){
  res.render('index');
});



// Start server
app.listen(app.get('port'));
console.log("Express server listening on", app.get('port'));



