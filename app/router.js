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
      "?*queryString": 'showQuery'
    },

    index: function() {
      var target = document.getElementById('main');
      var spinner = new Spinner(window.spinnerOpts).spin(target);
      
        var layout = app.useLayout('main');
        var list = new Feed.Collection();
        layout.insertView('.feed-init', new Feed.List({collection: list}));
      
    },
    showQuery: function(queryString){
      var params = this.parseQueryString(queryString);
      console.log(params);
      $.get('/feed',{body:params}, function(data){

      });
    },
    parseQueryString: function(queryString){
      var params = {};
      if(queryString){
          _.each(
              _.map(decodeURI(queryString).split(/&/g),function(el,i){
                  var aux = el.split('='), o = {};
                  if(aux.length >= 1){
                      var val;
                      if(aux.length == 2)
                          val = aux[1];
                      o[aux[0]] = val;
                  }
                  return o;
              }),
              function(o){
                  _.extend(params,o);
              }
          );
      }
      return params;
    }
  });

  return Router;

});
