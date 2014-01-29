var path = require('path');
var url = require('url');
var crypto = require('crypto');

exports = module.exports = function(root, storage, options){
  options = options || {};

  // root required
  if (!root) throw new Error('staticDropbox() root path required');

  // storage required
  if (!storage) throw new Error('staticDropbox() storage instance required');

  var cache = {};
  var maxTimeInCache = options.maxTimeInCache || 10000;

  function computeHash(obj) {
    var md5sum = crypto.createHash('md5');
    md5sum.update(obj);
    return md5sum.digest('hex');
  }


  function addToCache(pathname, obj) {
    
    // New scheduled deletion
    var timeoutID = setTimeout(function() {
      delete cache[pathname];
    }, maxTimeInCache);

    // Re-adding an already cached resource resets deletion schedule
    if (pathname in cache) {
      clearTimeout(cache[pathname].timeoutID);
      cache[pathname].timeoutID = timeoutID;
      return;
    }

    // Store in memory
    cache[pathname] = {
      timeoutID: timeoutID,
      timestamp: Date.now(),
      data: obj
    };
  }


  function readFromCache(pathname) {
    
    if (pathname in cache) {

      var timeoutID = setTimeout(function() {
        delete cache[pathname];
      }, maxTimeInCache);

      clearTimeout(cache[pathname].timeoutID);
      cache[pathname].timeoutID = timeoutID;

      return cache[pathname].data;
    }
    return null;
  }


  return function staticDropboxMiddleware(req, res, next) {
    if ('GET' != req.method && 'HEAD' != req.method) return next();
    var parsedURL = url.parse(req.url);

    var cached = readFromCache(parsedURL.pathname);

    if (cached) {
      res.contentType(path.basename(parsedURL.pathname));
      res.send(cached);
      return;
    }

    storage.readFile(path.join(root, parsedURL.pathname), function(err, data) {
      if (err) return next(err);

      if (storage.protocol === 'dropbox') addToCache(parsedURL.pathname, data);
      res.contentType(path.basename(parsedURL.pathname));
      res.send(data);
    });
  };
};
