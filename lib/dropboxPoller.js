var events = require('events');
var _ = require('lodash');
var request = require('request');
var async = require('async');
var noop = function() {};
var emitter = new events.EventEmitter();



// returns callback(error, {cursor, entries})
function getDropboxChangesList(options, callback) {
  callback = callback || noop;

  if (!options || typeof options !== 'object') return callback(new Error('getDropboxChangesList(): missing options argument'));
  if (!options.accessToken) return callback(new Error('getDropboxChangesList(): missing accessToken'));
  if (!options.storageRoot) return callback(new Error('getDropboxChangesList(): missing storageRoot'));

  _.defaults(options, {
    entries: [],
    cursor: undefined
  });

  var requestOptions = {
    uri: 'https://api.dropbox.com/1/delta',
    qs: {
      cursor: options.cursor,
      access_token: options.accessToken,
      path_prefix: '/' + options.storageRoot
    }
  };

  request.post(requestOptions, function(err, res, body) {
    var dropboxData;

    if (err) return callback(err);
    if (res.statusCode >= 400) return callback(res.statusCode);

    try {
      dropboxData = JSON.parse(body);
    } catch (parseError) {
      return callback(parseError);
    }

    options.cursor = dropboxData.cursor;

    // If reset is true it's the first call, so fuck it.
    // Also in case of empty or non-existant entries list 
    if (dropboxData.reset || !dropboxData.entries || !dropboxData.entries.length) {
      return callback(null, {cursor: options.cursor, entries: []});
    }

    // Concatenate entries list if it has content already
    if (options.entries.length === 0) {
      options.entries = dropboxData.entries;
    } else {
      options.entries = options.entries.concat(dropboxData.entries);
    }

    // Recursive if there are more entries to download
    // or finish with a callback
    if (dropboxData.has_more) {
      getDropboxChangesList(options, callback);
    } else {
      callback(null, {cursor: options.cursor, entries: options.entries});
      options.entries = [];
    }
  });
}




// returns callback(error, changes bool, backoff ms)
function openLongPollDeltaRequest(cursor, callback) {
  callback = callback || noop;

  if (!cursor) return callback(new Error('openLongPollDeltaRequest(): missing cursor argument'));

  var requestOptions = {
    uri: 'https://api-notify.dropbox.com/1/longpoll_delta',
    timeout: (120 +5) *1000,
    qs: {
      cursor: cursor,
      timeout: 30
    }
  };

  request(requestOptions, function(err, res, body) {
    var dropboxData;
    var backoffMs;
    
    if (err) return callback(err);
    if (res.statusCode >= 400) return callback(res.statusCode);

    try {
      dropboxData = JSON.parse(body);
    } catch (parseError) {
      return callback(parseError);
    }
    
    backoffMs = dropboxData.backoff * 1000 || 0;
    callback(null, dropboxData.changes, backoffMs);
  });
}




module.exports = function(root, token) {
  var options = {accessToken: token, storageRoot: root};

  getDropboxChangesList(options, function deltaCb(err, res) {

    // In case of error retry after 5 minutes
    if (err) {
      console.error(err);
      setTimeout(function() {
        getDropboxChangesList(options, deltaCb);
      }, 300000);
      return;
    }

    if (res.entries.length) emitter.emit('changes', res.entries);

    // Delta request was successful, schdule a new poll and wait for answer
    openLongPollDeltaRequest(res.cursor, function pollCb(err, hasChanges, backoffMs) {

      // In case of error restart from scratch after 30 seconds
      if (err) {
        console.error(err);
        setTimeout(function() {
          getDropboxChangesList(_.assign(options, {cursor: res.cursor}), deltaCb);
        }, backoffMs || 30000);
        return;
      }

      // If there are no changes set up polling again after backoff
      if (!hasChanges) {
        setTimeout(function() {
          openLongPollDeltaRequest(res.cursor, pollCb);
        }, backoffMs);
        return;
      }

      // If there are changes call the delta immediately
      setImmediate(function() {
        getDropboxChangesList(_.assign(options, {cursor: res.cursor}), deltaCb);
      });
    });

  });

  return emitter;
};

