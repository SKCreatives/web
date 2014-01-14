var Dropbox = require('dropbox');
var fs = require('fs');
var path = require('path');
var appDir = path.dirname(require.main.filename);
var _ = require('lodash');


// Matches
// (dropbox)://(a/b)
// (file)://(/a/b)
// ()(./a/b)
var storageRegExp = new RegExp('^([a-z][a-z0-9+-.]*(?=://))?(?:://)?(.+)?$','i');

function statLikeDropbox(err, stat, filepath, filename) {
  if (arguments.length < 3) throw new Error('statLikeDropbox(err, stat, filepath<, filename>) missing arguments');

  filename = filename || path.basename(filepath);

  return {
    path: filepath,
    name: filename,
    isFolder: stat.isDirectory(),
    isFile: stat.isFile(),
    modifiedAt: stat.mtime,
    size: stat.size,
    err: err,
    stat: stat
  };
}



/*
  Required options for Dropbox:
  - credentials object
*/

function Storage(storageURI, options) {
  options = options || {};

  if (!storageURI) throw new Error('storageURI missing');

  this.protocol = storageRegExp.exec(storageURI)[1];
  this.root = storageRegExp.exec(storageURI)[2];

  _.defaults(options, {
    credentials: false,
    appRoot: undefined
  });

  _.assign(this, options);

  var credentials = this.credentials;
  delete this.credentials;

  switch (this.protocol) {
    case "dropbox":
      if (!credentials) throw new Error('Storage missing Dropbox credentials');
      this.rootRegExp = new RegExp('^' + this.root, 'i');
      this.dropboxClient = new Dropbox.Client({
        key: credentials.DROPBOX_APP_KEY,
        secret: credentials.DROPBOX_APP_SECRET,
        token: credentials.DROPBOX_TOKEN
      });
      break;

    default:
      if (!this.appRoot) throw new Error('Storage missing app root in FS mode');
      var re = new RegExp('^' + this.appRoot, 'i');
      if (!this.root.match(re)) {
        this.root = path.join(this.appRoot, this.root);
        this.rootRegExp = new RegExp('^' + this.appRoot, 'i');
      }
  }
}


// Callback is passed error, filenames, dirStat, stats
Storage.prototype.readdir = function(pathname, options, callback) {
  if (!pathname.match(this.rootRegExp)) pathname = path.join(this.root, pathname);

  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  switch (this.protocol) {

    case 'dropbox':
      this.dropboxClient.readdir(pathname, options, function(err, filenames, dirStats, stats) {
        callback(err, filenames, dirStats, stats);
      });
      break;

    default:
      fs.readdir(pathname, function(err, filenames) {
        if (err) return callback(err);
        
        var stats = new Array(filenames.length);
        var error;

        filenames.forEach(function(filename, index) {
          var filepath = path.join(pathname, filename);
          
          fs.stat(filepath, function(err, stat) {
            error = error || err;
            stats[index] = statLikeDropbox(err, stat, filepath, filename);

            if (stats.length === filenames.length) {
              fs.stat(pathname, function(err, stat) {
                var dirStat = statLikeDropbox(err, stat, filepath, filename);
                callback(error, filenames, dirStat, stats);
              });
            }
          });
        });
      });
  }
};


// Path should always start without preceding slash
// Data arg is a buffer
Storage.prototype.readFile = function(pathname, options, callback) {
  if (!pathname.match(this.rootRegExp)) pathname = path.join(this.root, pathname);
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  switch (this.protocol) {
    case 'dropbox':
      _.assign(options, { buffer:true });
      this.dropboxClient.readFile(pathname, options, function(err, buffer) {
        if (err) return callback(err);
        var data;
        if (typeof options.encoding === 'string') {
          data = buffer.toString(options.encoding);
        } else {
          data = buffer;
        }
        callback(err, data);
      });
      break;
    default:
      fs.readFile(pathname, options, function(err, data) {
        callback(err, data);
      });
  }
};


Storage.prototype.writeFile = function(filename, data, options, callback) {
  if (!filename.match(this.rootRegExp)) filename = path.join(this.root, filename);

  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  switch (this.protocol) {
    case 'dropbox':
      this.dropboxClient.writeFile(filename, data, options, function(err, stat) {
        callback(err, stat);
      });
      break;
    default:
      fs.writeFile(filename, data, _.bind(function(err) {
        if (err) return callback(err);
        this.stat(filename, function(err, stat) {
          callback(err, stat);
        });
      }, this));
  }
};


Storage.prototype.stat = function(pathname, options, callback) {
  if (!pathname.match(this.rootRegExp)) pathname = path.join(this.root, pathname);

  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  switch (this.protocol) {
    case 'dropbox':
      this.dropboxClient.stat(pathname, options, function(err, stat) {
        callback(err, stat);
      });
      break;
    default:
      fs.stat(pathname, function(err, stat) {
        console.log(err, stat)
        if (err) return callback(err);
        var dbStyleStat = statLikeDropbox(err, stat, pathname);
        callback(err, dbStyleStat);
      });
  }
};

module.exports = Storage;
