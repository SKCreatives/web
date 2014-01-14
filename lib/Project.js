var crypto  = require('crypto');
var fs      = require('fs');
var path    = require('path');
var events  = require('events');
var util    = require('util');
var url     = require('url');
var async   = require('async');
var request = require('request');
var _       = require('lodash');
var cheerio = require('cheerio');
var moment  = require('moment');
var Storage  = require('./Storage.js');

var projectInstanceCID = 0;

var Project = function Project(uri, options) {
  options = options || {};

  if (arguments.length === 1 && typeof uri !== 'string') { options = uri; uri = undefined; }

  _.defaults(options, {
    cid: projectInstanceCID++,
    uri: uri,
    uriResolved: false,
    id: undefined,
    title: undefined,
    highlight: false,
    currency: undefined,
    blurb: undefined,
    goal: 0,
    pledged: 0,
    endTime: 0,
    launchTime: 0,
    backersCount: 0,
    video: null,
    services: [],
    cacheDir: 'cache'
  });

  var services = [
    {id: 'KS', domains: [ 'kickstarter.com', 'kck.st' ]},
    {id: 'IG', domains: [ 'indiegogo.com', 'igg.me' ]}
  ];
  
  if (!_.isArray(options.services)) throw new Error('services is not an Array');

  _.assign(this, options);

  this.services = _.uniq(this.services.concat(services), 'id');

  if (!this.uri && this.url) this.uri = this.url;

  if (!this.uri || !this.uri.match(this.__URIProtocolRegExp)) {
    console.error('Invalid URI', this.uri);
  }

  this.storage = new Storage(options.storageURI, options.storageOptions);

};

// assign scraper with Node events
util.inherits(Project, events.EventEmitter);

// Hashes the resolved URI concatenated with the response code
Project.prototype.createHashFromUriResolved = function() {

  if (!this.uriResolved) {
    console.error('No uriResolved to hash');
    return;
  }

  var md5sum = crypto.createHash('md5');
  md5sum.update('' + this.uriResolved, 'utf8');
  return md5sum.digest('hex');
};


// Resolves a URI, following redirects
Project.prototype.resolveURIAsync = function(callback) {
  callback = callback || this.__NOOP;

  request.head({uri: this.uri, timeout: 5000 }, _.bind(function(err, res) {
    if (!err) {
      if (res.statusCode === 200) {
        this.uriResolved = res.request.href;
        callback(err);
      } else {
        callback(res.statusCode);
      }
    } else {
      callback(err);
    }
  }, this));
};


// Returns the service ID (KS, IG, etc.)
Project.prototype.getServiceID = function() {
  var parsedURI = url.parse(this.uri);
  var serviceObj = _.find(this.services, function(obj) {
    return _.find(obj.domains, function(domain) {
      return (parsedURI.hostname.match(new RegExp(domain, 'gi')));
    });
  });

  return (serviceObj) ? serviceObj.id : undefined;
};


// Fetches initial data for the project. Smae for every service.
// Scraping is the different bit.
Project.prototype.getAsync = function(callback) {
  var start = Date.now();
  callback = callback || this.__NOOP;
  request.get({uri:this.uriResolved, timeout: 5000}, function(err, res, body) {
    if (err) {
      console.error(Date.now() - start, this.uri.href, err);
    }
    callback(err, res, body);
  });
};


// Scrape wrapper
Project.prototype.scrape = function(string) {
  var serviceID = this.getServiceID();
  var scrapeFn = this['__scrape' + serviceID];
  if (!scrapeFn) return;
  _.assign(this, scrapeFn.apply(this, [string]));
};


Project.prototype.loadFromCacheAsync = function(callback) {
  callback = callback || this.__NOOP;
  var self = this;
  var hash = this.createHashFromUriResolved();
  var re = /^[.~].*/gi;
  var done = function(err, result) {
    if (!err) _.assign(self, result);
    callback(err, result);
  };

  if (hash) {
    this.storage.readFile(path.join(this.cacheDir, hash) + '.json', {encoding: 'utf8'}, function(err, data) {
      if (!err) {
        done(null, JSON.parse(data));
      } else {
        done(err);
      }
    });
  } else {
    // We have no hash, so search ALL files in cache by unresolved uri
    this.storage.readdir(this.cacheDir, function(err, files, dirStat, stats) {
      if (err) return done(err);

      async.detect(stats, function(stat, callback) {
        if (stat.isFolder || stat.name.match(re)) return callback(false);
        self.storage.readFile(stat.path, {encoding: 'utf8'}, function(err, data) {
          if (err) return callback(false);
          callback((JSON.parse(data).uri === self.uri));
        });
      }, function(result) {
        if (!result) return done(undefined);
        self.storage.readFile(result.path, {encoding: 'utf8'}, function(err, data) {
          if (err) return done(undefined);
          done(null, JSON.parse(data));
        });
      });
    });
  }
};


// Writes to disk
Project.prototype.cacheToDiskAsync = function(callback) {

  callback = callback || this.__NOOP;
  var hash = this.createHashFromUriResolved();
  if (!hash) {
    console.error('Unable to hash. Did NOT write to disk');
    return;
  }

  var json = JSON.stringify(this, null, '\t');
  this.storage.writeFile(path.join(this.cacheDir, hash) + '.json', json, function (err, stat) {
    if (err) console.error('Error caching to disk', err);
    callback(err, stat);
  });
};


// Gets the HTML string and returns an object
Project.prototype.__scrapeKS = function(string) {

  var $ = cheerio.load(string, {ignoreWhitespace: true});
  var data = {}, JSONdata;
  
  _.find( $('script'), function(script, i) {
    var jsonSubstr = this.__KSProjectJSONRegExp.exec( $(script).text().replace(/\\\\/gi, '\\').replace(/\'/gi, '\'') );

    if (jsonSubstr && jsonSubstr.length > 1) {
      try { JSONdata = JSON.parse(jsonSubstr[1]) }
      catch(e) { console.error('JSON PARSE ERROR:', e) }
    }

    if (JSONdata) {
      return true;
    }
  }, this);

  if (!JSONdata) {
    console.error('SCRAPE FAILED');
    return;
  }

  _.each({
    id: 'id',
    title: 'name',
    blurb: 'blurb',
    goal: 'goal',
    pledged: 'pledged',
    currency: 'currency',
    endTime: 'deadline',
    launchTime: 'launched_at',
    backersCount: 'backers_count',
    video: 'video'
  }, function(ksKey, key) {
    data[key] = JSONdata[ksKey];
  }, this);

  data.launchTime = moment(data.launchTime + ' -0500', 'X Z');
  data.endTime = moment(data.endTime + ' -0500', 'X Z');

  data.video = {
    mp4: data.video.high,
    webm: data.video.webm,
    width: data.video.width,
    height: data.video.height,
    poster: data.video.frame
  };

  return data;
};


// Data scraper for IndieGogo
Project.prototype.__scrapeIG = function(string) {

  var data = {
    id: undefined,
    title: undefined,
    blurb: undefined,
    goal: 0,
    pledged: 0,
    currency: undefined,
    endTime: 0,
    launchTime: 0,
    backersCount: 0,
    video: null
  };
  
  var $ = cheerio.load(string, {ignoreWhitespace: true});
  var $headEl = $('head');
  var $bodyEl = $('body');
  var $metaEls = $headEl.find('meta');
  var $subHeaderEl = $bodyEl.find('.sub-header');
  var $fundingEl = $bodyEl.find('.funding');
  var $videoEl = $bodyEl.find('#pitchvideo iframe');

  // Find the ID
  _.find($metaEls, function(el) {
    _.find($(el).attr(), function(val, key) {
      var match = this.__IGIDRegExp.exec(val);
      if (match && match.length > 1) {
        data.id = parseInt(match[1], 10);
        return true;
      }
    }, this);
  }, this);

  // Find the title and other easy props
  data.title = $subHeaderEl.find('h1').text();
  data.blurb = $metaEls.filter('[name="description"]').attr('content');
  data.goal = parseFloat( $fundingEl.find('.goal .currency span').text().replace(/[^\d.]/gi, '') );
  data.pledged = parseFloat( $fundingEl.find('.amount .currency span').text().replace(/[^\d.]/gi, '') );
  data.currency = $fundingEl.find('.currency em').text();
  data.backersCount = parseFloat( $subHeaderEl.find('a[href$="pledges"]').text().split('/')[1] );
  data.video = {
    iframe: $videoEl.attr('src'),
    width: $videoEl.attr('width'),
    height: $videoEl.attr('height')
  };

  // Do the usual date parsing
  var dates = [];
  var dateText = $fundingEl.find('.funding-info').text();
  var dateMatches = this.__IGDateRegExp.exec(dateText);

  while (dateMatches) {
    dates.push(dateMatches[1]);   
    dateMatches = this.__IGDateRegExp.exec(dateText);
  }

  var timeMatch = this.__IGTimeRegExp.exec(dateText);
  var time = (timeMatch) ? timeMatch[1] : '00:00';

  if (!timeMatch) { console.log(dateText) }

  data.launchTime = moment(dates[0] + ' ' + time + ' -0800', 'MMMM D, YYYY HH:mm ZZ');
  data.endTime = moment(dates[1] + ' ' + time + ' -0800', 'MMMM D, YYYY HH:mm ZZ');

  _.assign(this, data);
  return data;
};


// No-op
Project.prototype.__NOOP = function() {};

// Prototype RegExpes
Project.prototype.__URIProtocolRegExp = new RegExp('https?://', 'i');
Project.prototype.__datastoreRegExp = new RegExp('^([a-z][a-z0-9+-.]*)://(.+)?$','i');
Project.prototype.__IGIDRegExp = new RegExp('indiegogo.com/projects/(\\d+)', 'i');
Project.prototype.__IGTimeRegExp = new RegExp('\\((\\d+:\\d+.*)PT\\)', 'i');
Project.prototype.__IGDateRegExp = new RegExp('\\s(\\w+\\s\\d+,\\s\\d+)\\s', 'gi');
Project.prototype.__KSProjectJSONRegExp = new RegExp('\\.current_project = "(.*)"', 'i');




module.exports = Project;


