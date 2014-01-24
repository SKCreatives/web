var request = require('request');
var fs = require('fs');
var Storage = require('./Storage.js');
var _ = require('lodash');
var moment = require('moment');
var path = require('path');

/*
1. Load from cache or download then cache
2. Update if timestamp is older than 6 hours
3. Return data
*/

var storage;
var instance;

module.exports = function(options) {
  if (instance) return instance;
  if (!options || !options.credentials) throw new Error('currencyConverter needs credentials');
  if (!options.storage && (!options.storageURI || !options.storageOptions)) throw new Error('currencyConverter missing Storage');

  _.defaults(options, {
    storage: null,
    storageOptions: null,
    storageURI: undefined,
    credentials: null,
    cacheDir: 'cache',
    cacheFilename: 'currency.json'
  });

  storage = storage || options.storage || new Storage(options.storageURI, options.storageOptions);




  function CurrencyConverter() {
    var _this = this;
    this.data = null;
    // this.lastRequest
    // this.updateIntervalID


    // Callback to retry a request in case it fails.
    function reqCallback(err, data) {
      if (err) {
        console.error(err);
        return setTimeout(function() {
          _this.request(reqCallback);
        }, 10000);
      }

      _this.data = data;
      _this.cacheToDisk();
    }

    // Get initial data, or retry until satisfied.
    storage.readFile(path.join(options.cacheDir, options.cacheFilename), {encoding: 'utf8'}, function cb(err, data) {
      if (err) {
        console.error(err);
        return _this.request(reqCallback);
      }

      try {
        JSON.parse(data);
      } catch (parseError) {
        console.error(parseError);
        return _this.request(reqCallback);
      }

      _this.data = JSON.parse(data);
      _this.lastRequest = moment(_this.data.lastRequest);
    });

    // Set up updates and cache to disk
    this.updateIntervalID = setInterval(function() {
      _this.update(function(err, data) {
        if (err) return console.error(err);
      });
    }, 10000);
  }




  CurrencyConverter.prototype.update = function(callback) {
    var _this = this;

    if (!this.data) return callback(new Error('Cannot update quotes until after the initial request'));

    // Don't fire requests more often than 12 hours
    if (this.lastRequest && moment().diff(this.lastRequest, 'hours') < 12) {
      return callback(null, this.data);
    }

    this.request(function(err, data) {
      if (err) return callback(err);

      _this.data = data;
      _this.cacheToDisk();
      callback(null, data);
    });
  };




  CurrencyConverter.prototype.cacheToDisk = function(callback) {
    var json = JSON.stringify(this.data, null, '\t');
    storage.writeFile(path.join(options.cacheDir, options.cacheFilename), json, function(err, stat) {
      if (err) return callback(err);
      console.log('rates cached to ', path.join(options.cacheDir, options.cacheFilename));
    });
  };



  // Callback with err, data
  CurrencyConverter.prototype.request = function(callback) {
    var data;
    var _this = this;

    request({
      uri: 'http://openexchangerates.org/api/latest.json',
      qs: {
        app_id: options.credentials.OPENEXCHANGERATES_KEY
      }
    }, function(err, res, body) {
      if (err) return callback(err);
      if (res.statusCode >= 400) return callback(res.statusCode);

      try {
        data = JSON.parse(body);
      } catch (parseError) {
        return callback(parseError);
      }

      _this.lastRequest = moment();
      data.lastRequest = _this.lastRequest;
      callback(null, data);
    });
  };



  CurrencyConverter.prototype.convert = function cc(fromSymbol, toSymbol, value) {
    value = value || 1;
    
    if (!this.data || !this.data.rates) return new Error('Rates not ready');

    var fromRate = this.data.rates[fromSymbol];
    var toRate = this.data.rates[toSymbol];

    return value * toRate/fromRate;
  };


  instance = new CurrencyConverter();
  return instance;
};
