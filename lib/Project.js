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

var REQUEST_TIMEOUT = 10000;
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
    customTitle: undefined,
    creatorName: undefined,
    location: undefined,
    highlight: false,
    currency: undefined,
    blurb: undefined,
    category: undefined,
    customBlurb: undefined,
    goal: 0,
    pledged: 0,
    endTime: 0,
    launchTime: 0,
    backersCount: 0,
    poster: undefined,
    video: null,
    services: [],
    cacheDir: 'cache',
  });

  // Remeber which keys were pre-defined in YAML
  this.predefinedKeys = [];

  _.each(options, function(val, key) {
    if (!val) {
      return;
    }
    this.predefinedKeys.push(key);
  }, this);

  var services = [
    {id: 'KS', domains: [ 'kickstarter.com', 'kck.st' ], label: 'Kickstarter'},
    {id: 'IG', domains: [ 'indiegogo.com', 'igg.me' ], label: 'IndieGogo'}
  ];
  
  if (!_.isArray(options.services)) {
    throw new Error('services is not an Array');
  }

  _.assign(this, options);

  this.services = _.uniq(this.services.concat(services), 'id');

  if (!this.uri && this.url) {
    this.uri = this.url;
  }

  if (!this.uri || !this.uri.match(this.__URIProtocolRegExp)) {
    util.error(new Error('Invalid URI' + this.uri).stack);
  }

  this.storage = new Storage(options.storageURI, options.storageOptions);
  delete this.storageOptions;

};

// assign scraper with Node events
util.inherits(Project, events.EventEmitter);

// Hashes the resolved URI concatenated with the response code
Project.prototype.createHashFromUriUnresolved = function() {
  var md5sum = crypto.createHash('md5');
  md5sum.update('' + this.uri, 'utf8');
  return md5sum.digest('hex');
};


// Resolves a URI, following redirects
Project.prototype.resolveURIAsync = function(callback) {
  callback = callback || this.__NOOP;

  request.head({uri: this.uri, timeout: REQUEST_TIMEOUT }, _.bind(function(err, res) {
    console.log(err, res.statusCode)
    if (!err) {
      // if (res.statusCode === 200) {
        this.uriResolved = res.request.href;
        callback(err);
      // } else {
        // callback(res.statusCode);
      // }
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

  if (serviceObj) {
    this.serviceLabel = serviceObj.label;
  }

  return (serviceObj) ? serviceObj.id : undefined;
};


// Fetches initial data for the project. Smae for every service.
// Scraping is the different bit.
Project.prototype.getAsync = function(callback) {
  var start = Date.now();
  callback = callback || this.__NOOP;
  request.get({uri:this.uriResolved, timeout: REQUEST_TIMEOUT}, function(err, res, body) {
    if (err) {
      util.error(Date.now() - start, this.uri.href, err);
    }
    callback(err, res, body);
  });
};


// Scrape async wrapper
Project.prototype.scrapeAsync = function(string, callback) {
  callback = callback || this.__NOOP;
  var serviceID = this.getServiceID();
  var scrapeFn = this['__scrape' + serviceID];
  if (!scrapeFn) {
    return;
  }

  scrapeFn.call(this, string, function (err, scrapeResult) {
    if (err) {
      callback(err);
      return;
    }

    _.each(scrapeResult, function(val, key) {
      if (_.indexOf(this.predefinedKeys, key) >= 0) {
        return;
      }

      var o = {};
      o[key] = val;
      _.assign(this, o);
    }, this);

    callback(null, scrapeResult);
  });
};


Project.prototype.loadFromCacheAsync = function(callback) {
  callback = callback || this.__NOOP;
  var self = this;
  var hash = this.createHashFromUriUnresolved();
  var re = /^[.~].*/gi;
  var done = function(err, result) {
    if (!err){
       _.assign(self, result);
    }
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
      if (err) {
        return done(err);
      }

      async.detect(stats, function(stat, callback) {
        if (stat.isFolder || stat.name.match(re)) {
          return callback(false);
        }

        self.storage.readFile(stat.path, {encoding: 'utf8'}, function(err, data) {
          if (err) {
            return callback(false);
          }

          callback((JSON.parse(data).uri === self.uri));
        });
      }, function(result) {
        if (!result) {
          return done(undefined);
        }

        self.storage.readFile(result.path, {encoding: 'utf8'}, function(err, data) {
          if (err) {
            return done(undefined);
          }

          done(null, JSON.parse(data));
        });
      });
    });
  }
};


// Writes to disk
Project.prototype.cacheToDiskAsync = function(callback) {

  callback = callback || this.__NOOP;
  var hash = this.createHashFromUriUnresolved();
  if (!hash) {
    util.error('Unable to hash. Did NOT write to disk');
    return;
  }

  var json = JSON.stringify(this, this.__JSONProperties, '\t');
  this.storage.writeFile(path.join(this.cacheDir, hash) + '.json', json, function (err, stat) {
    if (err) {
      util.error('Error caching to disk', err);
    }

    callback(err, stat);
  });
};


// Gets the HTML string and returns an object
Project.prototype.__scrapeKS = function(string, callback) {

  callback = callback || this.__NOOP;
  var $ = cheerio.load(string, {ignoreWhitespace: true});
  var data = {}, JSONdata;

  _.find( $('script'), function(script, i) {
    var jsonSubstr = this.__KSProjectJSONRegExp.exec( $(script).text().replace(/\\\\/gi, '\\').replace(/\'/gi, '\'') );

    if (jsonSubstr && jsonSubstr.length > 1) {
      try { JSONdata = JSON.parse(jsonSubstr[1]) }
      catch(e) { util.error('JSON PARSE ERROR:', e) }
    }

    if (JSONdata) {
      return true;
    }
  }, this);

  if (!JSONdata) {
    var err = new Error('KS scrape failed');
    callback(err);
    util.error(err.stack);
    return;
  }

  _.each({
    id: 'id',
    title: 'name',
    creatorName: 'creator',
    location: 'location',
    blurb: 'blurb',
    category: 'category',
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

  data.creatorName = JSONdata.creator.name;
  data.location = JSONdata.location.displayable_name;
  data.launchTime = moment(data.launchTime + ' -0500', 'X Z');
  data.endTime = moment(data.endTime + ' -0500', 'X Z');
  data.category = data.category.name;
  data.video = {
    iframe: $('meta').filter('[property="twitter:player:url"]').attr('content'),
    mp4: data.video.high,
    webm: data.video.webm,
    width: data.video.width,
    height: data.video.height,
    poster: data.video.frame
  };

  if (!data.video.iframe) {
    data.video = null;
  }

  callback.call(this, null, data);
};


// Data scraper for IndieGogo
Project.prototype.__scrapeIG = function(string, callback) {

  callback = callback || this.__NOOP;
  var data = {
    id: undefined,
    title: undefined,
    creatorName: undefined,
    location: undefined,
    blurb: undefined,
    category: undefined,
    goal: 0,
    pledged: 0,
    currency: undefined,
    endTime: 0,
    launchTime: 0,
    backersCount: 0,
    video: null
  };

  // Fetch the home page tab too
  request.get({uri:this.uriResolved + '/show_tab/home', timeout: REQUEST_TIMEOUT}, _.bind(function(err, res, body) {
    if (err) {
      util.error('IG Error retrieving home tab HTML');
      callback(err);
      return;
    }

    // Insert the AJAX response into the document
    var $ = cheerio.load(string, {ignoreWhitespace: true});
    var $homeTabContainerEl = $('.js-tab-content');
    $homeTabContainerEl.append(body);

    // Cache selectors
    var $bodyEl = $('body');
    var $metaEls = $('head meta');
    var $campaignPageEl = $bodyEl.find('.i-campaign-page');
    var $projectNutshell = $bodyEl.find('.i-bordered-box');
    var $videoEl = $bodyEl.find('#pitchvideo iframe');
    var $teamMembers = $bodyEl.find('.i-team-members li');

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


    // Find the manager
    _.find($teamMembers, function(el) {
      var $el = $(el);
      var isManager = $el.find('.i-role').text().match(/manager/i);
      
      if (!isManager) {
         return false;
      }

      data.creatorName = $el.find('.i-name').text();
      return true;
    });

    // Find the title and other easy props
    data.title = $campaignPageEl.find('h1').first().text();
    data.location = $campaignPageEl.find('.i-byline-location-link').text();
    data.blurb = $campaignPageEl.find('.i-tagline').first().text();
    data.goal = parseFloat( $projectNutshell.find('.i-raised .currency').text().replace(/[^\d.]/gi, '') );
    data.pledged = parseFloat( $projectNutshell.find('.i-balance .currency').text().replace(/[^\d.]/gi, '') );
    data.currency = $projectNutshell.find('.i-balance .currency em').text();
    data.backersCount = parseFloat( $campaignPageEl.find('.i-tab[data-tab-id$="pledges"] .i-count').text().replace(/[,.]/gi, '') );
    data.category = $campaignPageEl.find('.i-category-icon').siblings('a').text();
    data.video = {
      iframe: $videoEl.attr('src'),
      width: $videoEl.attr('width'),
      height: $videoEl.attr('height')
    };

    if (!data.video.iframe) {
      data.video = null;
    }

    // Build date info
    // Two arrays: Month, Day and Years

    var monthDayArr = [];
    var yearArr = [];
    var dateText = $projectNutshell.find('.i-funding-duration').text();
    var monthDayMatches = this.__IGMonthDayRegExp.exec(dateText);
    var yearMatches = this.__IGYearRegExp.exec(dateText);
    var timeMatch = this.__IGTimeRegExp.exec(dateText);
    var time = (timeMatch) ? timeMatch[1] : '00:00';
    var startDateString = '';
    var endDateString = '';

    while (monthDayMatches) {
      monthDayArr.push(monthDayMatches[1]);   
      monthDayMatches = this.__IGMonthDayRegExp.exec(dateText);
    }

    while (yearMatches) {
      yearArr.push(yearMatches[1]);   
      yearMatches = this.__IGYearRegExp.exec(dateText);
    }

    startDateString = monthDayArr[0] + ', ' + yearArr[0];
    endDateString = monthDayArr[1] + ', ' + (yearArr[1] || yearArr[0]);


    data.launchTime = moment(startDateString + ' ' + time + ' -0800', 'MMM D, YYYY HH:mm ZZ');
    data.endTime = moment(endDateString + ' ' + time + ' -0800', 'MMM D, YYYY HH:mm ZZ');

    callback.call(this, null, data);
  }, this));
};

Project.prototype.__JSONProperties = [
  'title',
  'uri',
  'uriResolved',
  'id',
  'highlight',
  'currency',
  'blurb',
  'category',
  'goal',
  'pledged',
  'endTime',
  'launchTime',
  'backersCount',
  'video',
  'iframe',
  'width',
  'height',
  'mp4',
  'webm',
  'poster',
  'customTitle',
  'creatorName',
  'location',
  'customBlurb'
]; 

// No-op
Project.prototype.__NOOP = function() {};

// Prototype RegExpes
Project.prototype.__URIProtocolRegExp = new RegExp('https?://', 'i');
Project.prototype.__datastoreRegExp = new RegExp('^([a-z][a-z0-9+-.]*)://(.+)?$','i');
Project.prototype.__IGIDRegExp = new RegExp('indiegogo.com/projects/(\\d+)', 'i');
Project.prototype.__IGTimeRegExp = new RegExp('\\((\\d+:\\d+.*)PT\\)', 'i');
Project.prototype.__IGYearRegExp = new RegExp('(\\d{4})', 'gi');
Project.prototype.__IGMonthDayRegExp = new RegExp('on\\s([a-zA-Z]+?\\s\\d{1,2})[\\s,]?', 'gi');
Project.prototype.__KSProjectJSONRegExp = new RegExp('\\.current_project = "(.*)"', 'i');




module.exports = Project;


