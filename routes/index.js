
/*
 * GET home page.
 */

module.exports.index = function(req, res){
  res.render('index');
};

module.exports.submissions = function(req, res){
  res.render('submissions');
};