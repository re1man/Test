define([
  // Application.
  "app",
  "spin",
  "bootstrap"
],

// Map dependencies from above array.
function(app,Spinner) {
  // Create a new module.
  var Feed = app.module();

  // Default model.
  Feed.Model = Backbone.Model.extend();

  // Default collection.
  Feed.Collection = Backbone.Collection.extend();

  Feed.ListBox = Backbone.View.extend({
    template: 'layouts/listBox',
    tagName: 'li',
    className: 'list-box',
    beforeRender: function(){
      this.insertView(new Feed.User({model: this.options.userMessage}));
    }
  });

  Feed.User = Backbone.View.extend({
    tagName: 'li',
    template: 'layouts/user-post',
    className: 'sticky',
    serialize: function(){
      return this.model.toJSON();
    },
    beforeRender: function(){
      if (this.model.get('userId') === Feed.userId){
        $(this.el).addClass('user-sticky');
      } else {
        $(this.el).addClass('other-user-sticky');
      } 
    },
    afterRender: function(){
      console.log('hi');
    }
  });

  Feed.Shop = Backbone.View.extend({
    tagName: 'li',
    className: 'shop-sticky sticky',
    template: 'layouts/shop-post'
  });

  Feed.Listing = Backbone.View.extend({
    tagName: 'li',
    className: 'listing-sticky sticky',
    template: 'layouts/listing-post'
  });

  Feed.List = Backbone.View.extend({
    template: 'layouts/list',
    className: 'feed',
    events: {
      'mouseenter .feed-tabs>li>a, .feed-filters>li': 'iconWhite',
      'mouseleave .feed-tabs>li>a, .feed-filters>li': 'iconBlack',
      'click .feed-tabs>li>a': 'resetIcon',
      'mouseenter .post-shout': 'iconWhitePostShout',
      'mouseleave .post-shout': 'iconBlackPostShout',
      'click .post-shout': 'postShout',
      'click .close-box': 'closeBox',
      'focus .user-shout': 'focusShout',
      'blur .user-shout': 'blurShout',
      'keyup .user-shout': 'checkText',
      'keydown .user-shout': 'checkText',
      'click .adjust-price': 'showPriceAdjuster'
    },
    initialize: function(){
      this.shoutPlaceholder = "Post something!";
      this.max = 140;
      this.facebook_id = '345555722142160';
      this.limit = 10;
    },
    iconWhitePostShout: function(e){
      $(e.currentTarget).addClass('icon-white');
    },
    iconBlackPostShout: function(e){
      $(e.currentTarget).removeClass('icon-white');
    },
    postShout: function(e){
      if ($('.user-shout').text().trim().length > 0){
        $('.post-shout').hide();
        var self = this;
        var target = $('.user-shout')[0];
        var spinner = new Spinner(window.spinnerOpts).spin(target);
        $('.user-shout').attr('contenteditable', 'false');
        $('.char-amount').empty();
        $.post('userShout', {msg: $('.user-shout').text()}, function(res){
          if (!res.msgs){
            $('.user-shout').popover('show');
          } else{
            var view = new Feed.ListBox({
              // Prepend the element instead of append.
                userMessage: new Feed.Model({msg: $('.user-shout').text(), userId: Feed.userId}),
                append: function(root, child) {
                  $(root).prepend(child);
                }
            });
            self.insertView('ul.feed-list', view);
            view.render();
          }
          $('.user-shout').text(self.shoutPlaceholder).addClass('pre-shout');
          $('.post-shout').show();
          $('.user-shout').attr('contenteditable', 'true');
        });
      }
      
      
    },
    closeBox: function(){
      $('.feed-tabs>li.active').find('i').removeClass('icon-white');
      $('.active').removeClass('active');
      $('.feed-list').removeClass('move-down');
    },
    checkText: function(e){
      if (e.keyCode === 13){
        this.postShout();
        e.currentTarget.blur();
        return false;
      } else {
        this.check_charcount(this.max, e);
      }
    },
    check_charcount: function(max, e){
        $('.char-amount').text(max - this.contentEditable.text().length +' ' + 'characters remaining. Press "Enter" to post.');
        if(e.which != 8 && this.contentEditable.text().length >= max)
        {
            e.preventDefault();
        }
    },
    showPriceAdjuster: function(){
      $('.search-slider-price').toggleClass('show');
    },
    iconWhite: function(e){
      $(e.currentTarget).find('i').addClass('icon-white');
    },
    iconBlack: function(e){
      if (!$(e.currentTarget).parent().hasClass('active')){
        $(e.currentTarget).find('i').removeClass('icon-white');
      }
    },
    resetIcon: function(e){
      if (!$(e.currentTarget).parent().hasClass('active')){
        $('.feed-tabs>li.active').find('i').removeClass('icon-white');
        $('.feed-list').addClass('move-down');
      }
    },
    focusShout: function(e){
      var text = $(e.currentTarget).text().trim();
      if (text === this.shoutPlaceholder) $(e.currentTarget).text('').removeClass('pre-shout');
      this.check_charcount(this.max, e);
      $('.user-shout').popover('hide');
    },
    blurShout: function(e){
      var text = $(e.currentTarget).text().trim();
      if (text.length === 0) {
        $(e.currentTarget).text(this.shoutPlaceholder).addClass('pre-shout');
        $('.char-amount').text('');
      }
    },
    checkWindow: function(){
      if ($(window).width() < 768){
        $('.feed-tab-li>a>span').hide();
        $('.feed-tab-li').addClass('center');
      } else {
        $('.feed-tab-li>a>span').show();
        $('.feed-tab-li').removeClass('center');
      }
      
    },
    getMessages: function(data){
      var otherMessages = _.shuffle(data.messages);
      var yourMessages = data.yourMessages.reverse();
      var total = 0;
      _.each(data.messages, function(message){
        for (var property in message) {
          total = total + message[property].length;
        }
      });
      total = total + data.yourMessages.length;
      for (var i = 0; i < this.limit; i++){
        if (i + 1 > total) break;
        //mine
        this.makeUserView(Feed.userId,yourMessages[i]);
        //yours
        for (var property in otherMessages[i]) {
          this.makeUserView(property, otherMessages[i][property][i]);
        }
      }
      
    },
    makeUserView: function(userId, msg){
      if (!msg) return false;
      var view = new Feed.ListBox({
        userMessage: new Feed.Model({msg: msg, userId: userId})
      });
      this.insertView('ul.feed-list', view);
      view.render();
    },
    beforeRender: function(){
      $(window).off();
    },
    beat: function(){
      $.get('/beat', function(){

      });
    },
    afterRender:function(){
      var self = this;
      this.checkWindow();
      $(window).on('resize', this.checkWindow);
      require( ['facebook-api!appId:' + this.facebook_id], function(FB) {
        $(".fb-login>img").click(function() {
           FB.login(function (response){
            if (response.status === 'connected') {
                check();
            }
           });
        });
        FB.getLoginStatus(function(response) {
            if (response.status === 'connected') {
                check();
            }
        });
        function check(){
          FB.api('/me', function(res){
              Feed.userId = res.id;
              $.post('/logIn', {id:res.id}, function(data){
                $('.fb-login').hide();
                $('.user-posting-section').find('.sticky').addClass('user-sticky');
                $('.user-posting-section').show();
                self.getMessages(data);
              });
          });
        }
      });

      this.contentEditable = $('.user-shout');
      $('.feed-tabs>li.active').find('i').addClass('icon-white');
      $('.post-shout, .close-box,.adjust-price').tooltip({placement: 'right'});
      $(".feed-filters>li").tooltip({placement: 'top'});
      $('.user-shout').popover({placement: 'top', trigger: 'manual'});
      $( ".search-slider-price" ).slider({
            range: true,
            min: 0,
            max: 500,
            values: [ 75, 300 ],
            slide: function( event, ui ) {
                $( ".price-amount" ).text( "$" + ui.values[ 0 ] + " - $" + ui.values[ 1 ] );
            }
        });
      $( ".price-amount" ).text( "$" + $( ".search-slider-price" ).slider( "values", 0 ) +
            " - $" + $( ".search-slider-price" ).slider( "values", 1 ) );
    }
  });
  // Return the module for AMD compliance.
  return Feed;

});
