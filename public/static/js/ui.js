/*global Util */

(function () {
  var util = new Util();
  var parseURI = util.parseURI;
  var has = util.has;
  var checkAnimationSupport = util.checkAnimationSupport;

  $(document).on('ready', function () {

    // Cached queries
    var $window = $(window);
    var $document = $(document);
    var $head = $('head');
    var $body = $('body');
    var $header = $('header');
    var $footer = $('footer');
    var $blurb = $('.blurb');
    var $collapsible = $('.collapsible');
    var $more = $('.more');

    // Expand description
    $more.on('click', function(e){
      e.preventDefault();
    });
    $blurb.on('click', function (){
      var targetHeight = 0;
      var currentHeight = $collapsible.height();
      
      if (currentHeight > 0) {
        $collapsible.animate({
          'height': 0
        }, 500);
        $blurb.animate({
          'opacity': 1
        }, 400);
      } else {
        $collapsible.children().each(function(i, el){
          targetHeight += $(el).outerHeight(true);
        });
        $blurb.animate({
          'opacity': 0
        }, 1000);
        $collapsible.animate({
            'height': targetHeight
        }, 1000);
      }
    });
  });
}());
