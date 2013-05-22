/*jshint es5:true */

var site = module.exports.site = {};

site.index = function(req, res){
  res.render('index');
};

site.submissions = function(req, res){
  res.render('submissions');
};