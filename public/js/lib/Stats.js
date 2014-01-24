/*global Raphael */

(function() {
  var SK = window.SK = window.SK || {};
  var raphael = Raphael;

  SK.DaysGraph = function(el, r, duration, w, h) {
    this.r = r || 100;
    this.duration = duration;
    this.w = w || r * 2;
    this.h = h || r * 2;    
    this.cx = w/2;
    this.cy = h/2;
    this.paper = raphael(el, w, h);

    var c = this.paper.circle(this.cx, this.cy, this.r);
    c.attr({
      'fill': 'url(/img/stats-dots-white.png)',
      'stroke': 'white',
      'stroke-width': 3
    });

    this.sector = this.update(0);
    this.sector.attr({
      'fill': 'white',
      'stroke': 'white',
      'stroke-width': 3
    });
  };

  SK.DaysGraph.prototype.update = function(value) {
    if (value === void 0) console.error('Invalid value for DaysGraph.update(value)');
    var elapsedRatio = (value / this.duration === 1) ? 0.999 : value / this.duration;
    var startAngle = 90 - (360 * elapsedRatio);
    var endAngle = 90;
    var rad = Math.PI / 180;
    var x1 = this.cx + this.r * Math.cos(-startAngle * rad);
    var y1 = this.cy + this.r * Math.sin(-startAngle * rad);
    var x2 = this.cx + this.r * Math.cos(-endAngle * rad);
    var y2 = this.cy + this.r * Math.sin(-endAngle * rad);
    var path = ["M", this.cx, this.cy, "L", x1, y1, "A", this.r, this.r, 0, +(endAngle - startAngle > 180), 0, x2, y2, "z"];

    if (!this.sector) {
      return this.paper.path(path);
    } else {
      this.sector.attr('path', path);
    }
  };



  SK.BackersGraph = function(el) {
    this.$el = $(el);
    this.$ghost = $('<div class="ghost-text">');
    this.$text = $('<div class="text">');
    
    this.$el.css({ 'line-height': this.$el.height() + 'px'});
    this.$el.append(this.$ghost);
    this.$el.append(this.$text);
    this.update(0);
  };

  SK.BackersGraph.prototype.update = function(value) {
    this.$ghost.text(value);
    var totalWidth = this.$el.width();
    var width = this.$ghost.outerWidth(true);
    var fontSize = parseInt(this.$text.css('font-size'), 10);
    var maxFontSize = 68;
    if (totalWidth < width) {
      while (totalWidth < width) {
        fontSize -= 1;
        this.$ghost.css('font-size', fontSize);
        width = this.$ghost.outerWidth(true);
      }
    } else {
      while (totalWidth > width && fontSize < maxFontSize) {
        fontSize += 1;
        this.$ghost.css('font-size', fontSize);
        width = this.$ghost.outerWidth(true);
      }
    }
    this.$text.css('font-size', fontSize);
    this.$text.text(value);
  };



  SK.PledgesGraph = function(el, total) {
    if (total === void 0) console.error('Invalid total for PledgesGraph(el, total)');
    this.$el = $(el);
    this.total = total;
    this.$gauge = $('<div class="gauge">');
    this.$text = $('<div class="text"/>');
    this.$textAmount = $('<span class="amount">');
    this.$textLabel = $('<span class="label"> pledged </span>');

    this.$text.append(this.$textAmount);
    this.$text.append(this.$textLabel);
    this.$gauge.append(this.$text);
    this.$el.append(this.$gauge);
  };

  SK.PledgesGraph.prototype.update = function(value, valueString) {
    if (value === void 0) console.error('Undefined value for PledgesGraph.update(value, valueString)');
    if (valueString === void 0) console.error('Undefined valueString for PledgesGraph.update(value, valueString)');

    var totalHeight = this.$el.height();
    var gaugeHeight = totalHeight * value / this.total;
    var textHeight = this.$text.height();

    this.$textAmount.text(valueString);
    this.$text.removeClass('inverted');

    if (gaugeHeight < textHeight) {
      this.$text.addClass('inverted');
      this.$text.css({'bottom': gaugeHeight + 20});
    }

    if (gaugeHeight > totalHeight) {
      gaugeHeight = totalHeight;
    }

    this.$gauge.height(gaugeHeight);
    this.$gauge.css({ 'line-height': gaugeHeight + 'px' });
  };





}());
