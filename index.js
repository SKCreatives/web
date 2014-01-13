var os       = require('os');
var fs       = require('fs');
var path     = require('path');
var http     = require('http');
var express  = require('express');
var connect  = require('connect');
var jade     = require('jade');
var lessCSS  = require('less-middleware');
var marked   = require('marked');
var yaml     = require('js-yaml');
var async    = require('async');
var colors   = require('colors');
var favicons = require('connect-favicons');
var nowww    = require('connect-no-www');
var cheerio  = require('cheerio');
var _        = require('lodash');
var config   = require('config');
var Dropbox  = require('dropbox');
var scraper  = require('./lib/Scraper.js');
var Project  = require('./lib/Project.js');
var Storage  = require('./lib/Storage.js');

var app = module.exports = express();
var port = process.env.PORT || 3000;
var credentials;
var dropbox;

try {
  credentials = require('./credentials.json');
} catch (e) {
  credentials = {
    DROPBOX_APP_KEY: process.env.DROPBOX_APP_KEY,
    DROPBOX_APP_SECRET: process.env.DROPBOX_APP_SECRET,
    DROPBOX_TOKEN: process.env.DROPBOX_TOKEN
  };
}

_.each(credentials, function(val, key) {
  if (!val) {
    throw new Error("Missing credential for " + key);
  }
});

var storageOptions = {
  credentials:credentials,
  appRoot: __dirname
};
var storage = new Storage(config.storage, storageOptions);
var projects = [];
var documents = {};

// Start the scraper
scraper = scraper({ projects: projects });
scraper.start();

// function 
// Load campaigns
function loadCampaigns(callback) {
  storage.readFile('projects.yaml', {encoding:'utf8'}, function(err, data) {
    if (err) return callback(err);

    var projectsArray = [];
    try {
      yaml.safeLoadAll(data, function(doc) {
        if (!doc) {
          err = new Error("YAML.safeLoadAll() empty or invalid doc error");
          return;
        }

        doc.storageURI = config.storage;
        doc.storageOptions = storageOptions;
        projectsArray.push(new Project(doc));
      });
    } catch (e) {
      return callback(e);
    } finally {
      if (err) return callback(err);
      if (projectsArray.length) {
        projects = app.locals.projects = scraper.projects = projectsArray;
        callback(null, projects);
      } else {
        callback(new Error("loadCampaigns() unknown error. Campaigns not updated."));
      }
    }
  });
}

loadCampaigns(function(err, campaigns) {
  console.log(err);
});

// Load documents
storage.readdir('documents', function(err, filenames, dirStat, stats) {
  console.log(err, stats)
});






// Express config
_.extend(app.settings, config);
app.disable('x-powered-by');
app.locals.settings['views'] = __dirname + '/views';
app.locals.settings['views engine'] = 'jade';
app.locals.pretty = false;
app.locals.basedir = __dirname;


// View utils
app.locals.marked = marked;


// View data
app.locals.projects = projects;


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


// Routing

app.get('/oauth_callback', function(req, res) {
  console.log(req.params, req.param);
});

app.get('/', function(req, res) {
  res.render('index');
});


// Start server
http.createServer(app).listen(port);
console.log('Listening on port ' + port);



