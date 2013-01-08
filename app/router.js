define([
  // Application.
  "app",
  "modules/feed",
  "spinnerOpts",
  "spin"

],

function(app, Feed, spinnerOpts, Spinner) {

  // Defining the application router, you can attach sub routers here.
  var Router = Backbone.Router.extend({
    routes: {
      "": "index",
      "admin":"admin"
    },

    index: function() {
      var target = document.getElementById('main');
      var spinner = new Spinner(window.spinnerOpts).spin(target);
      
        var layout = app.useLayout('main');
        var list = new Feed.Collection();
        layout.insertView('.feed-init', new Feed.List({collection: list}));
      
    },
    admin: function(){
      var target = document.getElementById('main');
      var spinner = new Spinner(window.spinnerOpts).spin(target);
      
        var layout = app.useLayout('main');
        var list = new Feed.Collection();
        layout.insertView('.feed-init', new Feed.List({collection: list, admin:true}));
    }
  });

  return Router;

});
