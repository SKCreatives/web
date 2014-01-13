var events = require('events');
var util = require('util');
var async = require('async');
var _ = require('lodash');


var Scraper = function(options) {
  options = options || {};

  _.defaults(options, {
    projects: []
  });

  _.assign(this, options);
};


// assign scraper with Node events
util.inherits(Scraper, events.EventEmitter);


Scraper.prototype.updateProjectAsync = function(project, callback) {
  // resolve URI
  // if it resolves OK, get, parse, cache
  // if errors try to load project from cache

  // Don't scrape past the first time if the project is not active.
  if ( project.endTime && Date.parse(project.endTime) < Date.now() ) {
    callback(null, true);
    return;
  }

  project.resolveURIAsync(function(err) {
    if (!err) {
      project.getAsync(function(err, res, body) {
        if (!err) {
          project.scrape(body);
          project.cacheToDiskAsync(function(err) {
            callback(null);
          });
        } else {
          console.error('GET ERROR', project.uri, err);
          callback(err);
        }
      });
    } else {
      console.error('URI RESOLVE ERROR', err);
      project.loadFromCacheAsync(function(err, result) {
        if (!err) {
          callback(null);
        } else {
          callback(err);
        }
      });
    }
  });
};


Scraper.prototype.start = function() {
  var self = this;
  async.eachSeries(this.projects, function(project, next) {
    self.updateProjectAsync(project, function(err, isInactive) {
      if (err) {
        console.log('FAILED TO UPDATE PROJECT', project.title);
      } else if (!isInactive) {
        console.log('UPDATED PROJECT', project.title);
      }
      next(null);
    });
  }, function() {
    setTimeout(function() {
      self.start();
    }, 10000);
  });
};


module.exports = function scraper(options) {
  if (scraper.instance) {
    return scraper.instance;
  }

  scraper.instance = new Scraper(options);
  return scraper.instance;
};
