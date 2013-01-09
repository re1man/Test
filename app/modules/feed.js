define([
  // Application.
  "app",
  "spin",
  "highlight",
  "qs",
  "bootstrap"
],

// Map dependencies from above array.
function(app,Spinner, highlight) {

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
      var userId = this.options.userMessage.get('userId');
      var index = this.options.userMessage.get('index');
      $(this.el).attr('user-id', this.options.userMessage.get('userId'));
      $(this.el).attr('message-index', this.options.userMessage.get('index'));
      Feed[userId][index].user = new Feed.User({model: this.options.userMessage, index: index});
      this.insertView(Feed[userId][index].user);
      if (this.options.comment) {
        var model = this.commentModel(this.options.comment.msg, this.options.comment.adminName);
        Feed[userId][index].comment = new Feed.User({model: model, index: index,otherUser: this.options.comment.id});
        this.insertView(Feed[userId][index].comment);
      }
    },
    commentModel: function(msg,adminName){
      var model = new Feed.Model({
            index: this.options.userMessage.get('index'),
            msg: msg,
            userId: this.options.userMessage.get('userId'),
            name: adminName
          });
      return model;
    },
    postComment: function(){
      if ($(this.el).find('.comment-sticky, .my-comment-sticky').length > 0 || this.options.userMessage.get('comment-user')){
        return false;
      }
      if (!Feed.userId){
         $('a[href="#shout"]').click();
         return false;
      }
        var model = this.commentModel("Post Comment");
        var view = new Feed.User({
          model: model,
          index: this.options.userMessage.get('index'),
          otherUser: Feed.userId,
          initial: model.get('msg')
        });
        this.insertView(view);
        view.render();
    },
    afterRender: function(){
      if ($(this.el).find('.comment-sticky, .my-comment-sticky,.comment-shop-sticky').length > 0 || this.options.userMessage.get('comment-user')){
        $('.post-comment').remove();
      }
    }
  });

  Feed.User = Backbone.View.extend({
    tagName: 'li',
    template: 'app/templates/layouts/user-post',
    className: 'sticky',
    initialize: function(){
      this.max = 140;
      this.shoutPlaceholder = this.model.get('msg');
      this.model.on('change', this.refresh, this);
      if (this.model.get('userId')[0] === 'a') this.admin = true;
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
      if (this.model.get('userId')[0] === 'a' && !this.options.otherUser){
        $(this.el).addClass('shop-sticky');
        return false;
      }
      if (this.options.otherUser) {
        if (this.options.otherUser[0] === 'a'){
          $(this.el).addClass('shop-sticky').addClass('comment-shop-sticky');
          return false;
        }
      }
      if (this.model.get('userId') === Feed.userId && !this.options.otherUser){
        $(this.el).addClass('user-sticky');
      } else if (this.options.otherUser && this.options.otherUser !== Feed.userId) {
        $(this.el).addClass('comment-sticky');
      } else if (this.options.otherUser && this.options.otherUser === Feed.userId){
        $(this.el).addClass('my-comment-sticky');
      } else {
        $(this.el).addClass('other-user-sticky');
      }
    },
    afterRender: function(){
      if (!Modernizr.touch) {
        this.$('.mobile').remove();
      } else {
        this.$('.desktop').remove();
      }
      if (this.admin && this.model.get('userId') === Feed.userId){
        $(this.el).find('.post-comment').hide();
      }
      if (this.options.otherUser) {
        if (this.options.otherUser[0] === 'a'){
          $(this.el).find('.post-comment').hide();
        }
      }
      if ((Feed.userId && this.model.get('userId') === Feed.userId && !this.options.otherUser)){
        this.makeEditable();
      } else if ((Feed.userId && this.options.otherUser === Feed.userId)){
        this.makeEditable();
      } else {
        if (!Modernizr.touch) $(this.el).find('.post-comment').tooltip({placement: 'right'});
      }
      if (this.options.otherUser === Feed.userId) {
        if (this.options.initial === this.model.get('msg')) $(this.el).find('.user-messaged').addClass('pre-shout');
      }
    },
    makeEditable: function(){
      this.contentEditable = $(this.el).find('.user-messaged');
        $(this.el).find('.user-messaged').attr('contenteditable', 'true');
        if (!Modernizr.touch) $(this.el).find('.post-shout').tooltip({placement: 'right'});
        $(this.el).attr('data-content', "There was an error. Please try again.");
        $(this.el).popover({placement: 'top', trigger: 'manual'});
        if (this.options.otherUser === Feed.userId && this.options.initial){
          $(this.el).find('.remove-comment').css('display', 'inline-block');
          if (!Modernizr.touch) $(this.el).find('.remove-comment').tooltip({placement: 'right'});

        }
    },
    events: {
      'focus .user-messaged': 'focusShout',
      'blur .user-messaged': 'blurShout',
      'keyup .user-messaged': 'checkText',
      'keydown .user-messaged': 'checkText',
      'click .post-shout': 'postShout',
      'click .remove-comment': 'removeView'
    },
    removeView: function(){
      this.remove();
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
      $(e.currentTarget).parent().addClass('pre-edit-shout');
      if (text === this.options.initial){
        $(e.currentTarget).text('');
        if (this.options.otherUser) $(e.currentTarget).text('').removeClass('pre-shout');
      }

      this.check_charcount(this.max, e);
      $(this.el).popover('hide');
    },
    blurShout: function(e){
      var text = $(e.currentTarget).text().trim();
      $(e.currentTarget).parent().removeClass('pre-edit-shout');
      if (text.length === 0 && this.options.otherUser) {
        $(e.currentTarget).text(this.shoutPlaceholder);
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
        if (this.options.otherUser){
          var userId = self.model.get('userId');
          var index = self.model.get('index');
          Feed[userId][index].comment = this;
          $.post('userShout', {msg: userMessaged.text(), userId: self.model.get('userId'), index:self.options.index, otherUser: self.options.otherUser}, function(res){
            self.afterPost(res, userMessaged,res.msgs[index].otherUser.adminName);
          });
        } else {
          $.post('userShout', {msg: userMessaged.text(), index:self.options.index}, function(res){
            self.afterPost(res, userMessaged);
          });
        }
        
      }
    },
    afterPost: function(res, userMessaged, adminName){
      var self = this;
      if (!res.msgs){
        userMessaged.parent().popover('show');
      } else{
        this.model.set('msg', userMessaged.text());
        if (adminName) this.model.set('name', adminName);
      }
      userMessaged.parent().removeClass('pre-edit-shout');
      userMessaged.removeClass('pre-shout');
      userMessaged.attr('contenteditable', 'true');
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
    template: 'app/templates/layouts/listing-post',
    afterRender: function(){
      if (!Modernizr.touch) {
        this.$('.mobile').remove();
      } else {
        this.$('.desktop').remove();
      }
    }
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
      'click .my-feed': 'myFeed',
      'keyup .search-box': 'search'
    },
    search: function(e){
      var q = $(e.currentTarget).val().trim();
      if (this.searchShouts){
        this.filter(q);
      }
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
          $('.user-posting-section').find('.post-shout').show();
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
        yourMessages = data.yourMessages;
      } else {
        yourMessages = [];
      }
      _.each(yourMessages, function(yourmessage, i){
        self.makeUserView(Feed.userId,yourmessage, i, true);
      });
      _.each(data.messages, function(message){
        for (var property in message) {
          self._makeUserView(message, property);
        }
      });
      
    },
    makeUserView: function(userId, msg, index, prepend){
      if ($('.list-box[user-id='+userId+']'+'[message-index='+index+']').length > 0){
        if (msg.msg !== Feed[userId][index].user.model.get('msg')){
          Feed[userId][index].user.model.set('msg', msg.msg);
        }
        if (msg.otherUser){
          if (!Feed[userId][index].comment){
            var model = new Feed.Model({
              index: index,
              msg: msg.otherUser.msg,
              userId: userId,
              name: msg.otherUser.adminName
            });
            Feed[userId][index].comment = new Feed.User({model: model, index: index,otherUser: msg.otherUser.id});
            this.insertView('.list-box[user-id='+userId+']'+'[message-index='+index+']', Feed[userId][index].comment);
            Feed[userId][index].comment.render();
          } else if (msg.otherUser.msg !== Feed[userId][index].comment.model.get('msg')){
            Feed[userId][index].comment.model.set('msg', msg.otherUser.msg);
          }
        }
      } else {

        if (!msg.msg) return false;
        if (!Feed[userId]) Feed[userId] = {};
        if (prepend) {
          Feed[userId][index] = new Feed.ListBox({
            userMessage: new Feed.Model({msg: msg.msg, name: msg.adminName, userId: userId, index:index}),
            comment: msg.otherUser,
            append: function(root, child) {
              $(root).prepend(child);
            }
          });
        } else {
          Feed[userId][index] = new Feed.ListBox({
            userMessage: new Feed.Model({msg: msg.msg, name: msg.adminName, userId: userId, index:index}),
            comment: msg.otherUser
          });
          
        }
        
        this.insertView('ul.feed-list', Feed[userId][index]);
        Feed[userId][index].render();
      }
    },
    beforeRender: function(){
      $(window).off();
    },
    beat: function(url){
      var self = this;
      setInterval(function(){
        $.get(url, function(data){
          self.moreMessages(data);
          self.updateCache();
        });
      },500);
    },
    filter: function(term){
      var scores = [];
      var self = this;
      if ( !term ) {
        this.rows.show();
      } else {
        this.rows.hide();
        this.rows.unhighlight();
        this.cache.each(function(i){
          var score = this.score(term);
          if (score > 0) { scores.push([score, i]); }
        });

        jQuery.each(scores.sort(function(a, b){return b[0] - a[0];}), function(){
          $(self.rows[ this[1] ]).show();
          $(self.rows[ this[1] ]).highlight(term);
        });
      }
    },
    updateCache: function(){
      this.rows = $('.feed-list').children('li');
      this.cache = this.rows.map(function(){
        return $(this).find('.user-messaged').text();
      });
      if ($('.search-box').val().trim() === ''){
        this.rows.show();
        this.rows.unhighlight();
      }
    },
    afterRender:function(){
        
      if (!Modernizr.touch) {
        this.$('.mobile').remove();
      } else {
        this.$('.desktop').remove();
      }

      var self = this;
      this.checkWindow();
      $(window).on('resize', this.checkWindow);
      if (this.options.admin){
        $('.fb-login').hide();
        setTimeout(function(){
          self.beat('/adminBeat');
        },3000);
        $.post('/adminLogin', {id:'9496'}, function(data){
                  Feed.userId = data.adminId;
                  self.searchShouts = true;
                  $('.user-posting-section').find('.sticky').addClass('shop-sticky');
                  $('.user-posting-section').show();
                  self.getMessages(data);
                  self.updateCache();
                });
      } else {
        require( ['facebook-api!appId:' + this.facebook_id], function(FB) {
          $(".fb-login>img").click(function() {
             FB.login(function (response){
              if (response.status === 'connected') {
                  check();
              }
              setTimeout(function(){
                self.beat('/beat');
              },3000);
             });
          });
          FB.getLoginStatus(function(response) {
              if (response.status === 'connected') {
                  check();
              }
              setTimeout(function(){
                self.beat('/beat');
              },3000);
              
          });
          function check(){
            FB.api('/me', function(res){
                Feed.userId = res.id;
                $.post('/logIn', {id:res.id}, function(data){
                  $('.fb-login').hide();
                  $('.user-posting-section').find('.sticky').addClass('user-sticky');
                  $('.user-posting-section').show();
                  self.getMessages(data);
                  self.updateCache();
                });
            });
          }
          
        });
      }
      

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
