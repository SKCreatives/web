/*global Raphael, SK */

$(function($) {
	
  // Raphael day stats
  var $stats = $('.stats');
  $stats.each(function(i, el) {
    var $el = $(el);
    var width = 200;
    var height = 200;
    
    var $backers = $el.find('.backers .graph');
    var backersGraph = new SK.BackersGraph($backers);
    backersGraph.update(2);

    var $days = $el.find('.days-remaining .graph');
    var daysremain = parseInt($el.find('.data.days').text(), 10);
    var duration = parseInt($el.find('.data.duration').text(), 10);
    var elapsed = duration - daysremain;
    var daysGraph = new SK.DaysGraph($days[0], 98, duration, 200, 200);
    daysGraph.update(elapsed === duration ? duration - 0.1 : elapsed);

    var $pledges = $el.find('.pledges .graph');
    var pledged = parseInt($el.find('.data.pledged').text(), 10);
    var goal = parseInt($el.find('.data.goal').text(), 10);
    var pledgesGraph = new SK.PledgesGraph($pledges[0], goal);
    pledgesGraph.update(pledged);

  });

	// Send form
	$('#subForm').submit(function (e) {
    e.preventDefault();
    $.getJSON(
    this.action + "?callback=?",
    $(this).serialize(),
    function (data) {
      if (data.Status === 400) {
        alert("Error: " + data.Message);
      } else { // 200
        alert("Success: " + data.Message);
      }
    });
  });




});