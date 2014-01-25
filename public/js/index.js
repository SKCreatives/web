/*global Raphael, SK, moment */

(function() {
  var SK = window.SK = window.SK || {};
  var now = moment();
  var HIGHLIGHTS_IMG_WIDTH = 790;
  var HIGHLIGHTS_IMG_RATIO = 2/1;
  var graphs = [];



  function getScaledImageSize(el, opts) {
    opts = opts || {};

    var naturalWidth = (el instanceof jQuery) ? el.width() : el.naturalWidth;
    var naturalHeight = (el instanceof jQuery) ? el.height() : el.naturalHeight;
    var naturalRatio = naturalWidth / naturalHeight;
    var width = opts.width;
    var height = opts.height;
    var boxWidth = HIGHLIGHTS_IMG_WIDTH;
    var boxHeight = HIGHLIGHTS_IMG_WIDTH / HIGHLIGHTS_IMG_RATIO;
    var boxRatio = HIGHLIGHTS_IMG_RATIO;
    var scaledWidth, scaledHeight, widthDiff, heightDiff;
    var left, top, right, bottom;

    if (width && height) {
      // Noop
    } else if (width) {
      height = width / naturalRatio;
    } else if (height) {
      width = height * naturalRatio;
    } else {
      width = naturalWidth;
      height = naturalHeight;
    }


    if (naturalRatio === boxRatio) {
      scaledWidth = boxWidth;
      scaledHeight = boxHeight;
    } else if (naturalRatio > boxRatio) {
      // letterbox fit / scale to fit height & pan left-right
      scaledHeight = boxHeight;
      scaledWidth = scaledHeight * naturalRatio;
    } else {
      // pillarbox fit / scale to fit width
      scaledWidth = boxWidth;
      scaledHeight = scaledWidth / naturalRatio;
    }

    widthDiff = boxWidth - scaledWidth;
    heightDiff = boxHeight - scaledHeight;

    switch (opts.pos) {
      case 1:
        left = 0;
        top = 0;
        break;
      case 2:
        right = 0;
        left = 0;
        top = 0;
        break;
      case 3:
        right = 0;
        top = 0;
        break;
      case 4:
        left = 0;
        top = 0;
        bottom = 0;
        break;
      case 6:
        right = 0;
        top = 0;
        bottom = 0;
        break;
      case 7:
        left = 0;
        bottom = 0;
        break;
      case 8:
        left = 0;
        right = 0;
        bottom = 0;
        break;
      case 9:
        right = 0;
        bottom = 0;
        break;
      default:
        top = heightDiff / 2;
        left = widthDiff / 2;
        // right = 0;
        // bottom = 0;
    }
    
    return {
      width: scaledWidth,
      height: scaledHeight,
      widthDiff: widthDiff,
      heightDiff: heightDiff,
      left: left, 
      top: top,
      right: right,
      bottom: bottom
    };
  }


  function updateGraph(obj) {
    var $el = obj.el;      
    var data = $el.data();

    var daysTotal = moment(data.endTime).diff(moment(data.launchTime), 'days');
    var daysLeft = moment(data.endTime).diff(now, 'days');
        daysLeft = daysLeft > 0 ? daysLeft : 0;
    var daysElapsed = daysTotal - daysLeft;

    obj.backersGraph.update(data.backersCount);
    obj.daysGraph.update(daysElapsed);
    obj.pledgesGraph.update(data.pledged, data.pledgedString);
  }




  $(function($) {

    var $htmlBody = $('html,body');
    var $window = $(window);
    var $navMenu = $('.nav-menu');
    var $cards = $('.card');
    var $highlights = $('#section-highlights');
    var $card = $($highlights.find('.card')[0]);
    var slideWidth = $card.width();
    var slideHeight = $card.height();





    // Scale / trim poster images on campaign cards
    $cards.find('.poster-img').imagesLoaded()
      .always( function( instance ) {})
      .done( function( instance ) {})
      .fail( function() {})
      .progress( function( instance, image ) {
        if (!image.isLoaded) return;
        var $el = $(image.img);
        var dims = getScaledImageSize(image.img);
        $el.css(dims);
        $el.fadeIn(1000);
      });





    // Intialise stats graphs
    var $stats = $('.stats');
    $stats.each(function generateGraphs(i, el) {
      var $el = $(el);      
      var data = $el.data();      
      var $backers = $el.find('.backers-graph');
      var $days = $el.find('.days-graph');
      var $pledges = $el.find('.pledges-graph');
      var $back = $el.find('.back-graph');

      var daysTotal = moment(data.endTime).diff(moment(data.launchTime), 'days');
      var daysLeft = moment(data.endTime).diff(now, 'days');
          daysLeft = daysLeft > 0 ? daysLeft : 0;
      var daysElapsed = daysTotal - daysLeft;

      var backersGraph = new SK.BackersGraph($backers);
      var daysGraph = new SK.DaysGraph($days[0], 78, daysTotal, 160, 160);
      var pledgesGraph = new SK.PledgesGraph($pledges[0], data.goal);

      backersGraph.update(data.backersCount);
      daysGraph.update(daysElapsed);
      pledgesGraph.update(data.pledged, data.pledgedString);

      graphs.push({
        el: $el,
        backersGraph: backersGraph,
        daysGraph: daysGraph,
        pledgesGraph: pledgesGraph
      });
    });





    // Slideshow setup when more than one project
    var $highlightsSlides = $highlights.find('.slides');
    if ($highlightsSlides.children().length > 1) {
      $highlightsSlides.slidesjs({
        width: slideWidth,
        height: slideHeight,
        play: {
          active: false,
          effect: "slide",
          interval: 5000,
          // auto: true,
          swap: true,
          pauseOnHover: true,
          restartDelay: 2500
        },
        navigation: {
          active: false,
          effect: "slide"
        },
        complete: function(number) {
          for (var i = 0, data; i < graphs.length; i++) {
            data = graphs[i];
            updateGraph(data);
          }
        }
      });
    }





    // Delegate click events on cards archive
    // Update graphs toggle special classes for hiding children on iOS
    $('#section-archive').on('click', '.archive-header-row', function() {
      var $el = $(this);
      var $card = $el.parentsUntil('#section-archive').filter('.card');
      if ($card.hasClass('active')) {
        $card.removeClass('active');
      } else {
        setTimeout(function() {
          for (var i = 0, data; i < graphs.length; i++) {
            data = graphs[i];
            updateGraph(data);
          }
        }, 200);
        $card.addClass('active show-children');
      }
    });

    $('#section-archive').on('transitionend -webkit-transitionend -moz-transitionend -ms-transitionend', '.card', function() {
      var $el = $(this);
      if (!$el.hasClass('active')) {
        $el.removeClass('show-children');
      }
    });





    // Scroll to hash on load
    if (window.location.hash) {
      $window.scrollTo($(window.location.hash), {offset: -$navMenu.height(), duration:200, axis:'y'});
    }

    // Scroll to headers
    $navMenu.on('click', '.nav-menu-item', function(e) {
      var $el = $(this);
      var id = $el.find('a').attr('href');
      var scrollmem = $('body').scrollTop();
      window.location.hash = id;
      $htmlBody.scrollTop(scrollmem);
      e.preventDefault();
      $window.scrollTo($(id), {offset: -$navMenu.height(), duration:1000, axis:'y'});
    });





    // Sticky menu
    var navOffset = $navMenu.offset().top;
    var prevDiff = 0;
    
    setTimeout(function() {
      if (navOffset - window.scrollY <= 0) {
        $navMenu.addClass('fixed');
      }
    }, 2000);

    $window.on('scroll', function() {
      if (navOffset - window.scrollY <= 0 && prevDiff > 0) {
        $navMenu.addClass('fixed');
      } else if (navOffset - window.scrollY > 0 && prevDiff <= 0) {
        $navMenu.removeClass('fixed');
      }
      prevDiff = navOffset - window.scrollY;
    });





    // Send form
    $('#subForm').submit(function (e) {
      e.preventDefault();
      $.getJSON(this.action + "?callback=?", $(this).serialize(), function (data) {
        if (data.Status >= 400) {
          $('#subForm').find('.form-message').addClass('error');
        }
        
        $('#subForm').find('.form-message').text(data.Message);
      });
    });

  }); // onready

}()); // closure