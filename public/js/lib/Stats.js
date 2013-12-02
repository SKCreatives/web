/*global Raphael */

(function() {
  window.SK = window.SK || {};

  var DaysGraph = window.SK.DaysGraph = function(el, r, duration, w, h) {
    var self = this;
    self.r = r || 100;
    self.duration = duration;
    self.w = w || r * 2;
    self.h = h || r * 2;    
    self.cx = w/2;
    self.cy = h/2;
    self.paper = Raphael(el, w, h);

    var c = self.paper.circle(self.cx, self.cy, self.r);
    c.attr({
      'fill': 'url(/img/stats-dots-white.png)',
      'stroke': 'white',
      'stroke-width': 3
    });

    self.sector = self.update(0);
    self.sector.attr({
      'fill': 'white',
      'stroke': 'white',
      'stroke-width': 3
    });
  };

  DaysGraph.prototype.update = function(value) {
    var self = this;
    var startAngle = 90- (360 * value / self.duration);
    var endAngle = 90;
    var rad = Math.PI / 180;
    var x1 = self.cx + self.r * Math.cos(-startAngle * rad);
    var y1 = self.cy + self.r * Math.sin(-startAngle * rad);
    var x2 = self.cx + self.r * Math.cos(-endAngle * rad);
    var y2 = self.cy + self.r * Math.sin(-endAngle * rad);
    var path = ["M", self.cx, self.cy, "L", x1, y1, "A", self.r, self.r, 0, +(endAngle - startAngle > 180), 0, x2, y2, "z"];
    
    if (!self.sector) {
      return self.paper.path(path);
    } else {
      self.sector.attr('path', path);
    }
  };



  var BackersGraph = window.SK.BackersGraph = function(el) {
    var self = this;
    self.$el = (el instanceof jQuery) ? el : $(el);
    self.$ghost = $('<div class="text" style="position: absolute; visibility: hidden; height: auto; width: auto;">');
    self.$text = $('<div class="text">');
    var pos = self.$el.css('position');
    if (pos !== 'absolute' || pos !== 'relative') {
      self.$el.css('position', 'relative');
    }
    self.$el.css({ 'line-height': self.$el.height() + 'px', 'text-align': 'center' });
    self.$text.css({ 'vertical-align': 'top', 'display':'inline-block' });
    self.$el.append(self.$ghost);
    self.$el.append(self.$text);
    self.update('0');
  };

  BackersGraph.prototype.update = function(value) {
    var self = this;
    self.$ghost.text(value);
    var totalWidth = self.$el.width();
    var width = self.$ghost.outerWidth(true);
    var fontSize = parseInt(self.$text.css('font-size'), 10);
    var maxFontSize = 68;
    if (totalWidth < width) {
      while (totalWidth < width) {
        fontSize -= 1;
        self.$ghost.css('font-size', fontSize);
        width = self.$ghost.outerWidth(true);
      }
    } else {
      while (totalWidth > width && fontSize < maxFontSize) {
        fontSize += 1;
        self.$ghost.css('font-size', fontSize);
        width = self.$ghost.outerWidth(true);
      }
    }
    self.$text.css('font-size', fontSize);
    self.$text.text(value);
  };



  var PledgesGraph = window.SK.PledgesGraph = function(el, total, currency) {
    var self = this;
    self.total = total || 0;
    self.currency = currency || '£';
    self.$el = (el instanceof jQuery) ? el : $(el);
    var pos = self.$el.css('position');
    if (pos !== 'absolute' || pos !== 'relative') {
      self.$el.css('position', 'relative');
    }
    self.$gauge = $('<div class="gauge" style="position: absolute; bottom: 0; width: 100%">');
    self.$text = $('<div class="text" style="width:100%; text-align: center;">');
    self.$text.css({ 'vertical-align': 'top', 'display':'inline-block' });
    self.$gauge.append(self.$text);
    self.$el.append(self.$gauge);
  };

  PledgesGraph.prototype.update = function(value) {
    var self = this;
    var totalHeight = self.$el.height();
    var gaugeHeight = totalHeight * value / self.total;
    if (gaugeHeight > totalHeight) { gaugeHeight = totalHeight }

    self.$text.text(self.currency + value + ' pledged');
    var textHeight = self.$text.height();
    if (gaugeHeight < textHeight) {
      self.$text.css({
        'position': 'absolute',
        'top': -textHeight -20,
        'color': 'white',
        'text-shadow': '0px 0px 2px rgb(0,30,97), 0px 0px 10px rgb(0,77,251)'
      });
    } else {
      self.$text.css({
        'position': 'relative',
        'top': 'auto',
        'color': 'rgb(0,77,251)',
        'text-shadow': 'none'
      });
    }
    self.$gauge.height(gaugeHeight);
    self.$gauge.css({ 'line-height': gaugeHeight + 'px' });
  };





}());
