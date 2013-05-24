var async        = require('async');
var string       = require('string');
var cheerio      = require('cheerio');
var request      = require('request');
var _            = require('underscore');

var tmp = {};

var scrape = module.exports.scrape = function(url, callback) {
  var data = {
    url: url
  };
  var ks = request.get(url, function(err, res, body) {
    if (!err) {
      var $ = cheerio.load(body);
      var $allEls = $('body').find('*');
      $allEls.each(function(i, el) {
        var $el = $(el);
        _.each($el.attr(), function(val, key) {
          if (key.match(/^data-/) && !key.match(/data-render/)) {
            key = key.match(/^data-(.*)/)[1];
            var camelCased = key.replace(/[-_]([a-z])/g, function (g) { return g[1].toUpperCase() });
            data[camelCased] = val;
          }
        });
      });
      tmp[url] = data;
    }
    if (callback) { callback(err, data); }
  });
};


var scrapeEach = module.exports.scrapeEach = function(projects, callback) {
  var result = null;
  var urls = _.map(projects, function(project) {
    var url;
    if (_.isObject(project)) { url = project.ksurl || project.url || project.uri; }
    else { url = project; }
    return url;
  });

  async.each(urls, scrape, function(err) {
    if (err) {
      tmp = {};
    }
    if (callback) { callback(err, tmp); }
  });
};


var polls = {};

var poll = module.exports.poll = function(url, interval, callback) {
  if (_.isFunction(interval)) { callback = interval; interval = 3600 }
  interval = interval || 3600;
  request.get(url, function(err, res, body) {
    var data = null;
    if (!err) {
      try {
        data = JSON.parse(body);
        // Create poll cache if not exists
        if (!polls[url]) {
          var intervalID = setInterval(function() {
            poll(url, interval, callback);
          }, interval);
          polls[url] = data.project;
          polls[url].intervalID = intervalID;
        }
        // Cehck if poll cahce data is stale
        var updated = null;
        _.each(data.project, function(prop, key) {
          if (polls[url][key] !== prop) {
            if (!updated) { updated = {} }
            updated[key] = prop;
          }
          polls[url][key] = prop;
        });
      } catch(e) {
        err = new Error('Failed to parse response.');
      }
    }
    if (callback) callback(err, updated);
  });
};

var unpoll = module.exports.unpoll = function(url) {
  var poll = _.find(polls, function(val, key) {
    return key === url;
  });
  if (poll) {
    clearInterval(poll.intervalID);
    delete polls[url];
    return poll;
  }
};
