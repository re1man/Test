// Set the require.js configuration for your application.
require.config({

  // Initialize the application with the main application file.
  deps: ["main"],

  paths: {
    // JavaScript folders.
    libs: "../assets/js/libs",
    plugins: "../assets/js/plugins",
    vendor: "../assets/vendor",

    // Libraries.
    jquery: "../assets/js/libs/jquery",
    lodash: "../assets/js/libs/lodash",
    backbone: "../assets/js/libs/backbone",
    handlebars: "../assets/js/libs/handlebars-1.0.0.beta.6",
    bootstrap: "../assets/js/libs/bootstrap",
    "jquery-ui": "../assets/js/libs/jquery-ui-1.9.2.custom",
    "facebook-api": "../assets/js/libs/facebook-api",
    'propertyParser':'../assets/js/plugins/propertyParser',
    'spin':'../assets/js/plugins/spin',
    'spinnerOpts':'../assets/js/plugins/spinnerOpts',
    'touch-punch':'../assets/js/plugins/jquery.ui.touch-punch'
  },

  shim: {
    // Backbone library depends on lodash and jQuery.
    backbone: {
      deps: ["lodash", "jquery"],
      exports: "Backbone"
    },
    bootstrap: {
      deps: ["jquery"],
      exports: "Bootstrap"
    },
    "jquery-ui":{
      deps: ["jquery"],
      exports: "Jquery-ui"
    },
    "touch-punch": {
      deps: ["jquery-ui"],
      exports: "Touch-Punch"
    },
    // Handlebars has no dependencies.
    handlebars: {
      exports: "Handlebars"
    },
    "spin":{
      deps: ["spinnerOpts"],
      exports: "Spin"
    },

    // Backbone.LayoutManager depends on Backbone.
    "plugins/backbone.layoutmanager": ["backbone"]
  }

});
