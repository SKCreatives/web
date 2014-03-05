var Dropbox    = require('dropbox');

var port = process.env.PORT || 3000;
var credentials;

try {
  credentials = require('./credentials.json');
} catch (e) {
  credentials = {
    DROPBOX_APP_KEY: process.env.DROPBOX_APP_KEY,
    DROPBOX_APP_SECRET: process.env.DROPBOX_APP_SECRET
  };
}

if (!credentials.DROPBOX_APP_KEY) throw new Error('Missing DROPBOX_APP_KEY credential');
if (!credentials.DROPBOX_APP_SECRET) throw new Error('Missing DROPBOX_APP_SECRET credential');


var dropboxClient = new Dropbox.Client({
  key: credentials.DROPBOX_APP_KEY,
  secret: credentials.DROPBOX_APP_SECRET
});

dropboxClient.authDriver(new Dropbox.AuthDriver.NodeServer({port:port}));

dropboxClient.authenticate(function(error, client) {
  if (error) {
    console.log(error)
  } else {
    console.log('SUCCESS! Your DROPBOX_TOKEN is')
    console.log(client._oauth._token)
    process.exit();
  }
});
