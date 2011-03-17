/**
 * NodeLog
 */

// Libs
var express = require('express');
var mongoose = require('mongoose');
var MongoStore = require('connect-mongo');

var settings = require('./settings');
var db = mongoose.connect('mongodb://localhost/'+settings.db);
var util = require('./util');
var models = require('./models');
var admin = require('./admin');
var site = require('./site');
var middleware = require('./middleware');

var app = module.exports = express.createServer();

// Configuration
app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.session({
    secret: settings.cookie_secret,
    store: new MongoStore({
      db: settings.db
    })
  }));
  app.use(middleware.locals);
  app.use(express.compiler({ src: __dirname + '/public', enable: ['less'] }));
});

app.configure('development', function(){
  // Disable Google Analytics 
  settings.ga_id = false;
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
  app.use(express.static(__dirname + '/public'));
});

app.configure('production', function(){
  app.use(express.errorHandler());

  // 500 Handler
  app.error(function(err, req, res) {
    console.log(err.stack);
    res.render('500.jade', {error: err});
  });
});

app.use(app.router);

// Error handling
function NotFound(msg) {
  this.name = 'NotFound';
  Error.call(this, msg);
  Error.captureStackTrace(this, arguments.callee);
}

NotFound.prototype.__proto__ = Error.prototype;

// 404 Handler
app.error(function(err, req, res, next) {
  if (err instanceof NotFound) {
    res.render('404', {status: 404});
  } else {
    next(err);
  }
});

// Routes
app.get('/feed.rss', site.feed);
app.get(/^\/(?:page\/(\d+))?$/, middleware.get_ad, site.index);
app.get(/^\/(\d{4})\/(\d{2})\/(\d{2})\/([a-zA-Z-0-9]+)\/?/, middleware.get_ad, site.post);

// Admin
app.all('/admin/logout', admin.logout);
app.get('/admin/login', admin.login);
app.post('/admin/login', admin.login_post);
app.get('/admin', admin.require_login, admin.index);
app.get('/admin/ad', admin.require_login, middleware.get_ad, admin.ad);
app.post('/admin/ad', admin.require_login, admin.ad_post);
app.get('/admin/post', admin.require_login, admin.post_index);
app.get('/admin/post/new', admin.require_login, admin.post_new);
app.post('/admin/post/new', admin.require_login, admin.post_new_save);
app.get('/admin/post/edit/:id', admin.require_login, admin.post_edit);
app.post('/admin/post/edit/:id', admin.require_login, admin.post_edit_save);
app.get('/admin/post/delete/:id', admin.require_login, admin.post_delete);

// 404
app.all('*', function(req, res, next) {
  next(new NotFound);
});

// Only listen on $ node app.js
if (!module.parent) {
  app.listen(settings.port);
  console.log("Express server listening on port %d", app.address().port);
}

