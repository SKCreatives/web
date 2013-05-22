/*global */
/*jshint es5:true */

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


// Prefill default config and merge with app.locals
// 
_(appConfig).defaults({
  listenPort: 2002,
  marked: marked
});
_(app.locals).defaults(appConfig);


// Load all projects
// 
var appData = [];
var dataDir = __dirname + app.locals.dataDir;
var dataFiles = fs.readdirSync(dataDir);
_.each(dataFiles, function(filename) {
  var buf = fs.readFileSync(dataDir + '/' + filename, 'utf8');
  var project = [];
  yaml.loadAll(buf, function (doc) {
    project.push(doc);
  });
  appData.push(project);
});

app.locals.data = appData;


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

var routes = require('./routes');

app.get('/', routes.index);
app.get('/submissions', routes.submissions);



// Start server
app.listen(appConfig.listenPort);
console.log("Express server listening on", appConfig.listenPort);



