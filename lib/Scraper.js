var events = require('events');
var util = require('util');
var async = require('async');
var _ = require('lodash');


var Scraper = function (options) {
  options = options || {};

  _.defaults(options, {
    projects: []
  });

  _.assign(this, options);
};


// assign scraper with Node events
util.inherits(Scraper, events.EventEmitter);


Scraper.prototype.updateProjectAsync = function (project, callback) {
  // resolve URI
  // if it resolves OK, get, parse, cache
  // if errors try to load project from cache

  // Don't scrape past the first time if the project is not active.
  if ( project.endTime && Date.parse(project.endTime) < Date.now() ) {
    callback(null, true);
    return;
  }
  
  project.resolveURIAsync(function (err) {
    console.log(err)
    if (err) {
      util.error('URI RESOLVE ERROR for ' + project.uri, err.stack);
      project.loadFromCacheAsync(function (err, result) {
        if (err) {
          util.error('Error loading ' + project.uri + ' from cache');
          return callback(err);
        }
        _.assign(project, result);
        callback(null);
      });
      return;
    }

    project.getAsync(function (err, res, body) {
      if (err) {
        util.error('GET ERROR', project.uri, err);
        callback(err);
        return;
      }
      project.scrapeAsync(body, function (err, data) {
        if (err) {
          util.error('GET ERROR', project.uri, err);
          callback(err);
          return;
        }

        project.cacheToDiskAsync(function (err) {
          callback(null);
        });
      });
    });
  });
};


Scraper.prototype.start = function() {
  var self = this;
  async.eachSeries(this.projects, function (project, next) {
    self.updateProjectAsync(project, function (err, isInactive) {
      console.log(err)
      if (err) {
        console.log('FAILED TO UPDATE PROJECT', project.title);
      } else if (!isInactive) {
        console.log('UPDATED PROJECT', project.title);
      }
      next(null);
    });
  }, _.bind(function () {
    setTimeout(function () {
      self.start();
    }, 10000);
  }, this));
};


module.exports = function scraper (options) {
  if (scraper.instance) {
    _.assign(scraper.instance, options);
    return scraper.instance;
  }

  scraper.instance = new Scraper(options);
  return scraper.instance;
};
