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
      "admin":"admin",
      "auth/etsy/callback?*queryString": "redirect",
      "authenticated": "authenticated"
    },

    index: function() {
      this.renderView();
    },
    admin: function(){
      this.renderView(true);
    },
    redirect: function(){
      Backbone.history.navigate('#authenticated');
    },
    authenticated: function(){
      this.renderView(false, true);
    },
    renderView: function(admin, showShops){
      var target = document.getElementById('main');
      var spinner = new Spinner(window.spinnerOpts).spin(target);
      
      var layout = app.useLayout('main');
      var list = new Feed.Collection();
      layout.insertView('.feed-init', new Feed.List({collection: list, admin:admin, showShops:showShops}));
    }

  });

  return Router;

});
