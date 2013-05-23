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
var async        = require('async');
var colors       = require('colors');
var chromeframe  = require('connect-chromeframe');
var favicons     = require('connect-favicons');
var nowww        = require('connect-no-www');
var _            = require('underscore');
var appPackage   = require('./package.json');
var appConfig    = fs.existsSync('./config.json') ? require('./config.json') : {};
var ks           = require('./lib/ks.js');

var app = module.exports  = express();

app.locals.marked = marked;


_.defaults(appConfig, {
  dataDir: "/data", 
  listenPort: 2002
});

_.extend(appConfig, appConfig.host[os.hostname()]);
_.extend(appConfig, appConfig.mode[app.get('env')]);
_.extend(app.settings, appConfig);



// Load all projects and site data
var projects = app.locals.projects = [];
var site = app.locals.site = [];
var dataDir = __dirname + app.get('dataDir');
var dataFiles = fs.readdirSync(dataDir);
_.each(dataFiles, function(filename) {
  var stats = fs.statSync(dataDir + '/' + filename);
  if (stats.isFile()) {
    var buf = fs.readFileSync(dataDir + '/' + filename, 'utf8');
    var docs = [];
    yaml.loadAll(buf, function (doc) {
      docs.push(doc);
    });
    if (filename.match(/^projects/)) {
      projects = docs;
    } else {
      site.push(docs);
    }
  }
});


// Load Kickstarter extended project data
var cache = fs.existsSync(dataDir+'/cached/projects.json') ? require(dataDir+'/cached/projects.json') : [];

if (cache) {
  // Expire whatever is not found in projects
  _.each(cache, function(cached, i) {
    var isValid = _.findWhere(projects, {ksurl: cached.ksurl});
    if (!isValid) {
      console.log('deleting', cached.ksurl, 'from cache');
      cache.splice(i,1);
    }
  });
}

// Check if the project is in the cache. If not try to fetch it and refresh the cache.
// if fetching fails, stick with the exisiting cache
async.each(projects, function(project, callback) {
  var cached = _.findWhere(cache, {ksurl: project.ksurl});
  if (!cached) {
    scrapeProject(project, function(err, data) {
      callback(err, data);
    });
  } else {
    _.extend(project, cached);
    callback(null);
  }
}, function(err) {
  if (!err) {
    _.each(projects, function(project) {
      ks.poll(project.pollUrl, function(err, updated) {
        onPoll(err, updated, project);
      });
    });
  }
});



function onPoll(err, updated, project) {
  if (!err) {
    if (updated) {
      console.log('Updated', project.ksurl.green, updated)
      _.extend(project, updated);
      scrapeProject(project);
    }
  } else {
    console.log('Polling error');
    ks.unpoll(project.pollUrl);
    scrapeProject(project, function(err) {
      if (err) {
        console.log(err);
      }
    });
  }
}

function scrapeProject(project, callback) {
  ks.scrape(project.ksurl, function(err, data) {
    if (!err) {
      // Poll url may have changed
      ks.unpoll(project.pollUrl);
      // Extend with new data
      _.extend(project, data);
      // Restart polling with new url
      ks.poll(project.pollUrl, function(err, updated) {
        onPoll(err, updated, project);
      });
    } else {
      setTimeout(function() {
        scrapeProject(project, callback);
      }, 5000);
    }
    if (callback) callback(err, data);
  });
}




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



