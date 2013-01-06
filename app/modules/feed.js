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
  Feed.Intervals = {};
  // Default model.
  Feed.Model = Backbone.Model.extend();

  // Default collection.
  Feed.Collection = Backbone.Collection.extend();

  Feed.ListBox = Backbone.View.extend({
    template: 'app/templates/layouts/listBox',
    tagName: 'li',
    className: 'list-box',
    events: {
      'click .post-comment': 'postComment'
    },
    beforeRender: function(){
      this.int = this.options.userMessage.get('userId');
      $(this.el).attr('user-id', this.options.userMessage.get('userId'));
      $(this.el).attr('message-index', this.options.userMessage.get('index'));
      this.insertView(new Feed.User({model: this.options.userMessage, index: this.options.userMessage.get('index')}));
    },
    postComment: function(){
      if ($(this.el).find('.comment-sticky').length > 0 || this.options.userMessage.get('comment-user')){
        return false;
      }
        var model = new Feed.Model({
          index: this.options.userMessage.get('index'),
          msg: "Post Comment",
          userId: this.options.userMessage.get('userId')
        });
        var view = new Feed.User({
          model: model,
          index: this.options.userMessage.get('index'),
          otherUser: Feed.userId
        });
        this.insertView(view);
        view.render();
    }
  });

  Feed.User = Backbone.View.extend({
    tagName: 'li',
    template: 'app/templates/layouts/user-post',
    className: 'sticky',
    initialize: function(){
      this.shoutPlaceholder = this.model.get('msg');
      this.model.on('change', this.refresh, this);
    },
    refresh: function(){
      this.shoutPlaceholder = this.model.get('msg');
      this.render();
      $(this.el).find('.user-messaged').trigger('blur');
    },
    serialize: function(){
      return this.model.toJSON();
    },
    beforeRender: function(){
      if (this.model.get('userId') === Feed.userId){
        $(this.el).addClass('user-sticky');
      } else if (this.options.otherUser) {
        $(this.el).addClass('comment-sticky');
      } else {
        $(this.el).addClass('other-user-sticky');
      }
    },
    afterRender: function(){
      if (this.model.get('userId') === Feed.userId || this.options.otherUser){
        this.contentEditable = $(this.el).find('.user-messaged');
        $(this.el).find('.user-messaged').attr('contenteditable', 'true');
        if (!Modernizr.touch) $(this.el).find('.post-shout').tooltip({placement: 'right'});
        $(this.el).attr('data-content', "There was an error. Please try again.");
        $(this.el).popover({placement: 'top', trigger: 'manual'});
      } else {
        if (!Modernizr.touch) $(this.el).find('.post-comment').tooltip({placement: 'right'});
      }
      if (this.options.otherUser) {
        $(this.el).find('.user-messaged').addClass('pre-shout');
      }
    },
    events: {
      'focus .user-messaged': 'focusShout',
      'blur .user-messaged': 'blurShout',
      'keyup .user-messaged': 'checkText',
      'keydown .user-messaged': 'checkText',
      'click .post-shout': 'postShout'
    },
    checkText: function(e){
      if (e.keyCode === 13){
        this.postShout();
        return false;
      } else {
        this.check_charcount(this.max, e);
      }
    },
    check_charcount: function(max, e){
        if(e.which != 8 && this.contentEditable.text().length >= max)
        {
            e.preventDefault();
        }
    },
    focusShout: function(e){
      var text = $(e.currentTarget).text().trim();
      if (text === this.shoutPlaceholder){
        $(e.currentTarget).text('');
        $(e.currentTarget).parent().addClass('pre-edit-shout');
        if (this.options.otherUser) $(e.currentTarget).text('').removeClass('pre-shout');
      }

      this.check_charcount(this.max, e);
      $(this.el).popover('hide');
    },
    blurShout: function(e){
      var text = $(e.currentTarget).text().trim();
      $(e.currentTarget).text(this.shoutPlaceholder);
      $(e.currentTarget).parent().removeClass('pre-edit-shout');
      if (text.length === 0 && this.options.otherUser) {
        $(e.currentTarget).text(this.shoutPlaceholder).addClass('pre-shout');
      }
    },
    postShout: function(){
      var userMessaged = $(this.el).find('.user-messaged');
      if (userMessaged.text().trim().length > 0 && userMessaged.text().trim() !== this.shoutPlaceholder){
        $('.post-shout').hide();
        var self = this;
        var target = userMessaged[0];
        var spinner = new Spinner(window.spinnerOpts).spin(target);
        userMessaged.attr('contenteditable', 'false');
        $.post('userShout', {msg: userMessaged.text(), index:self.options.index}, function(res){
          if (!res.msgs){
            userMessaged.parent().popover('show');
          } else{
            self.model.set('msg', userMessaged.text());
          }
          userMessaged.parent().removeClass('pre-edit-shout');
          userMessaged.attr('contenteditable', 'true');
        });
      }
    }
  });

  Feed.Shop = Backbone.View.extend({
    tagName: 'li',
    className: 'shop-sticky sticky',
    template: 'app/templates/layouts/shop-post'
  });

  Feed.Listing = Backbone.View.extend({
    tagName: 'li',
    className: 'listing-sticky sticky',
    template: 'app/templates/layouts/listing-post'
  });

  Feed.List = Backbone.View.extend({
    template: 'app/templates/layouts/list',
    className: 'feed',
    events: {
      'mouseenter .feed-tabs>li>a, .feed-filters>li': 'iconWhite',
      'mouseleave .feed-tabs>li>a, .feed-filters>li': 'iconBlack',
      'click .feed-tabs>li>a': 'resetIcon',
      'mouseenter .post-shout, .post-comment': 'iconWhitePostShout',
      'mouseleave .post-shout, .post-comment': 'iconBlackPostShout',
      'click .user-posting-section>.sticky>.post-shout': 'postShout',
      'click .close-box': 'closeBox',
      'focus .user-shout': 'focusShout',
      'blur .user-shout': 'blurShout',
      'keyup .user-shout': 'checkText',
      'keydown .user-shout': 'checkText',
      'click .my-feed': 'myFeed'
    },
    initialize: function(){
      this.shoutPlaceholder = "Post something!";
      this.max = 140;
      this.facebook_id = '345555722142160';
      this.limit = 10;
    },
    myFeed: function(e){
      if ($(e.currentTarget).hasClass('engaged')){
        $(e.currentTarget).removeClass('engaged');
        $('.other-user-sticky').parent().show();
      } else {
        $(e.currentTarget).addClass('engaged');
        $('.other-user-sticky').parent().hide();
      }
    },
    iconWhitePostShout: function(e){
      if (!Modernizr.touch) $(e.currentTarget).addClass('icon-white');
    },
    iconBlackPostShout: function(e){
      if (!Modernizr.touch) $(e.currentTarget).removeClass('icon-white');
    },
    postShout: function(e){
      if ($('.user-shout').text().trim().length > 0 && $('.user-shout').text().trim() !== this.shoutPlaceholder){
        $('.post-shout').hide();
        var self = this;
        var target = $('.user-shout')[0];
        var spinner = new Spinner(window.spinnerOpts).spin(target);
        $('.user-shout').attr('contenteditable', 'false');
        $('.char-amount').empty();
        $.post('userShout', {msg: $('.user-shout').text()}, function(res){
          if (!res.msgs){
            $('.user-shout').popover('show');
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
      if (!Modernizr.touch) $(e.currentTarget).find('i').addClass('icon-white');
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
      var yourMessages;
      if (data.yourMessages){
        yourMessages = data.yourMessages.reverse();
      } else {
        yourMessages = [];
      }
      var total = 0;
      _.each(data.messages, function(message){
        for (var property in message) {
          total = total + message[property].length;
        }
      });
      total = total + yourMessages.length;
      if (total === 0) return false;
      for (var i = 0; i < total; i++){
        //mine
        if (yourMessages[i]) {
          this.makeUserView(Feed.userId,yourMessages[i], i);
        }

        
        //yours
        if (otherMessages[i]){
          for (var property in otherMessages[i]) {
          if (data.messages.length === 0) continue;
            this.makeUserView(property, otherMessages[i][property][i], i);
          }
        }
        
      }
      
    },
    _makeUserView: function(message, property){
      var self = this;
      _.each(message[property], function(msg, i){
          self.makeUserView(property, msg, i);
        });
    },
    moreMessages: function(data){
      var self = this;
      var yourMessages;
      if (data.yourMessages){
        yourMessages = data.yourMessages.reverse();
      } else {
        yourMessages = [];
      }
      _.each(yourMessages, function(yourmessage, i){
        self.makeUserView(Feed.userId,yourmessage, i);
      });
      _.each(data.messages, function(message){
        for (var property in message) {
          self._makeUserView(message, property);
        }
      });
      
    },
    makeUserView: function(userId, msg, index){
      if ($('.list-box[user-id='+userId+']'+'[message-index='+index+']').length > 0){
        var elem = $('.list-box[user-id='+userId+']'+'[message-index='+index+']');
        var mes = elem.find('.user-messaged').not('.comment-sticky > .user-messaged');
        if (mes.text().trim() !== msg.msg) {
          mes.fadeOut('fast', function(){
            $(this).text(msg.msg).fadeIn('fast');
          });
        }
      } else {
        if (!msg.msg) return false;
        var view = new Feed.ListBox({
          userMessage: new Feed.Model({msg: msg.msg, userId: userId, index:index})
        });
        this.insertView('ul.feed-list', view);
        view.render();
      }
      
    },
    beforeRender: function(){
      $(window).off();
    },
    beat: function(){
      var self = this;
      setInterval(function(){
        $.get('/beat', function(data){
          self.moreMessages(data);
        });
      },500);
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
            } else {
              self.beat();
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
      if (!Modernizr.touch){
        $('.post-shout, .close-box,.adjust-price').tooltip({placement: 'right'});
        $(".feed-filters>li, .search-filters>li").tooltip({placement: 'top'});
      }
      $('.user-shout').popover({placement: 'top', trigger: 'manual'});
      
    }
  });
  // Return the module for AMD compliance.
  return Feed;

});
