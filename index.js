/*global */
/*jshint es5:true */

var os           = require('os');
var fs           = require('fs');
var path         = require('path');
var express      = require('express');
var jade         = require('jade');
var lessCSS      = require('less-middleware');
var marked       = require('marked');
var yaml         = require('js-yaml');
var chromeframe  = require('connect-chromeframe');
var favicons     = require('connect-favicons');
var nowww        = require('connect-no-www');
var _            = require('underscore');
var appPackage   = require('./package.json');
var appConfig    = fs.existsSync('./config.json') ? require('./config.json') : {};

var app = module.exports  = express();

_.defaults(appConfig, {
  dataDir: "/data", 
  listenPort: 2002
});

_.extend(appConfig, appConfig.host[os.hostname()]);
_.extend(appConfig, appConfig.mode[app.get('env')]);
_.extend(app.settings, appConfig);


// Load all projects
// 
var appData = [];
var dataDir = __dirname + app.get('dataDir');
var dataFiles = fs.readdirSync(dataDir);
_.each(dataFiles, function(filename) {
  var buf = fs.readFileSync(dataDir + '/' + filename, 'utf8');
  var docs = [];
  yaml.loadAll(buf, function (doc) {
    docs.push(doc);
  });
  appData.push(docs);
});


app.locals.data = appData;
app.locals.marked = marked;


// Configuration
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
_(app.locals).extend({
  pretty: true,
  basedir: __dirname
});


// Middleware
app.use(nowww());
app.use(favicons(__dirname + '/public/img/icons'));
app.use(chromeframe());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser('skyfall'));
app.use(express.session());
app.use(app.router);
app.use(lessCSS({ src: __dirname + '/public' }));
app.use(express.directory(path.join(__dirname, 'public'), { icons:true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));



// Routing
var site = require('./routes').site;
app.get('/', site.index);



// Start server
app.listen(app.get('listenPort'));
console.log("Express server listening on", app.get('listenPort'));



