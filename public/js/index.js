(function() {
	$(function() {
		
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
}());