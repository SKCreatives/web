var path     = require('path');
var http     = require('http');
var express  = require('express');
var connect  = require('connect');
var jade     = require('jade');
var lessCSS  = require('less-middleware');
var marked   = require('marked');
var yaml     = require('js-yaml');
var async    = require('async');
var moment   = require('moment');
var numeral  = require('numeral');
var favicons = require('connect-favicons');
var nowww    = require('nowww');
var request  = require('request');
var cheerio  = require('cheerio');
var _        = require('lodash');
var config   = require('config');
var Dropbox  = require('dropbox');
var scraper  = require('./lib/Scraper.js');
var Project  = require('./lib/Project.js');
var Storage  = require('./lib/Storage.js');
var dropMW   = require('./lib/staticDropbox-middleware.js');
var dropPoll = require('./lib/dropboxPoller.js');
var currency = require('./lib/currencyConverter.js');

var app = module.exports = express();
var port = process.env.PORT || 3000;
var noop = function() {};
var credentials;
var dropbox;

try {
  credentials = require('./credentials.json');
} catch (e) {
  credentials = {
    DROPBOX_APP_KEY: process.env.DROPBOX_APP_KEY,
    DROPBOX_APP_SECRET: process.env.DROPBOX_APP_SECRET,
    DROPBOX_TOKEN: process.env.DROPBOX_TOKEN,
    OPENEXCHANGERATES_KEY: process.env.OPENEXCHANGERATES_KEY
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

// Start the currency converter
currency = currency({ storage: storage, credentials: credentials });

// function 
// Load campaigns
function loadCampaigns(callback) {
  callback = callback || noop;
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
function loadDocuments(callback) {
  callback = callback || noop;
  storage.readdir('documents', function(err, filenames, dirStat, stats) {
    if (err) return callback(err);

    async.each(
      stats,
      function iterator(stat, fn) {
        storage.readFile('documents/' + stat.name, {encoding: 'utf8'}, function(err, data) {
          if (err) {
            console.error(err);
            return fn(null);
          }

          switch (path.extname(stat.name)) {
            case '.markdown':
            case '.md':
            case '.mdd':
              documents[stat.name.replace(path.extname(stat.name), '')] = data;
              fn(null);
            break;
            default:
              fn(null);
          }
        });
      },
      function done(err) {
        callback(err, documents);
      }
    );
  });
}


loadDocuments(function(err, docs) {
  // console.log(docs);
});





if (storage.protocol === 'dropbox') {
  dropPoll(storage.root, credentials.DROPBOX_TOKEN).on('changes', function(entries) {
    // Scan entries for interesting stuff
    // We only want to know if project.yaml
    // or any file in /documents was updated
    var loadCampaignsOnce = _.once(loadCampaigns);
    var loadDocumentsOnce = _.once(loadDocuments);

    for (var i = 0, entry, filename, basename; i < entries.length; i++) {
      entry = entries[i];
      filename = entry[0];
      basename = path.basename(filename);

      if (basename === 'projects.yaml') {
        loadCampaignsOnce(function(err, campaings) {
          console.log('campaings updated');
        });
      }

      if (filename.match(new RegExp('documents/', 'i'))) {
        loadDocumentsOnce(function(err, docs) {
          console.log('docs updated');
        });
      }
    }
  });
}






// Express config
_.extend(app.settings, config);
app.disable('x-powered-by');
app.locals.settings['views'] = __dirname + '/views';
app.locals.settings['view engine'] = 'jade';
app.locals.pretty = false;
app.locals.basedir = __dirname;


// View utils
app.locals._ = _;
app.locals.marked = marked;
app.locals.moment = moment;
app.locals.numeral = numeral;
app.locals.currency = currency;

// View data
app.locals.projects = projects;
app.locals.documents = documents;


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
app.use(lessCSS({ src: path.join(__dirname, 'public') }));
app.use(express.directory(path.join(__dirname, 'public'), { icons:true }));
app.use(express.static(path.join(__dirname, 'public')));
if (storage.protocol === 'dropbox') {
  app.use(dropMW('public', storage));
}
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



