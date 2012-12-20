var Util = (function () {
  var instanceCount = 0;
  return function Util (opts) {
    opts = opts || {};
    var self = this;
    self.cid = 'util_' + instanceCount++;
  };
}());

Util.prototype.parseURI = function (uri) {
  uri = uri || window.location.href;
  var us = (function () {
    var a = document.createElement('a');
    a.href = window.location.href;
    return a.hostname;
  }());
  
  var parser = document.createElement('a');
  parser.href = uri;

  /* Magic */
  var parsed =  {
      protocol: parser.protocol // => "http:"
    , hostname: parser.hostname // => "example.com"
    , port:     parser.port     // => "3000"
    , pathname: parser.pathname // => "/this/is/a/path"
    , search:   parser.search   // => "?search=test&mario=1"
    , hash:     parser.hash     // => "#hash"
    , host:     parser.host     // => "example.com:3000"
    , queries:  {}              // => {search:'test', mario:1}
    , fragments:[]              // => ['this','is','a','path']
    , external: us !== parser.hostname
  };

  /* Splits the/URL/fragments into an array */
  var parts = parsed.pathname.split('/');
  var i, part;
  for (i = 0; i < parts.length; i++) {
    part = parts[i];
    if (part !== '/' && part !== '') parsed.fragments.push(part);
  }

  /* Collects key/value pairs from the query string */
  parts = parsed.search.slice(1).split('&'); // => ['mario=true', 'luigi=2']
  var j;
  for (i = 0; i < parts.length; i++) {    
    part = parts[i].split('=');
    if (part.length > 1) parsed.queries[part[0]] = part[1];
  }

  return parsed;
};

Util.prototype.checkAnimationSupport = function() {
  var elm = document.createElement('div');
  var animation = false,
      animationstring = 'animation',
      keyframeprefix = '',
      domPrefixes = 'Webkit Moz O ms Khtml'.split(' '),
      pfx  = '';
   
  if( elm.style.animationName ) { animation = true; }    
   
  if( animation === false ) {
    for( var i = 0; i < domPrefixes.length; i++ ) {
      if( elm.style[ domPrefixes[i] + 'AnimationName' ] !== undefined ) {
        pfx = domPrefixes[ i ];
        animationstring = pfx + 'Animation';
        keyframeprefix = '-' + pfx.toLowerCase() + '-';
        animation = true;
        break;
      }
    }
  }
  return animation;
};

Util.prototype.has = function (obj, key) { return Object.prototype.hasOwnProperty.call(obj, key) };

