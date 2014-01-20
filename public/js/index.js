/*global Raphael, SK, moment */

$(function($) {

  var SK = window.SK = window.SK || {};
  var now = moment();

  // Raphael day stats
  $('.stats').each(function(i, el) {
    var $el = $(el);
    
    var data = $el.data();

    // console.log(data.pledged, data.goal)
    
    var $backers = $el.find('.backers-graph');
    var $days = $el.find('.days-graph');
    var $pledges = $el.find('.pledges-graph');
    var $back = $el.find('.back-graph');

    var daysTotal = moment(data.endTime).diff(moment(data.launchTime), 'days');
    var daysLeft = moment(data.endTime).diff(now, 'days');
        daysLeft = daysLeft > 0 ? daysLeft : 0;
    var daysElapsed = daysTotal - daysLeft;

    var backersGraph = new SK.BackersGraph($backers);
    var daysGraph = new SK.DaysGraph($days[0], 98, daysTotal, 200, 200);
    var pledgesGraph = new SK.PledgesGraph($pledges[0], data.goal);

    backersGraph.update(data.backersCount);
    daysGraph.update(daysElapsed);
    pledgesGraph.update(data.pledged, data.pledgedString);

  });

  // Send form
  $('#subForm').submit(function (e) {
    e.preventDefault();
    $.getJSON(this.action + "?callback=?", $(this).serialize(), function (data) {
      if (data.Status >= 400) return new Error(data.Status + ' ' + data.Message);
    });
  });

});