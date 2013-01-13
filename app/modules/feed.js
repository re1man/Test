define([
  // Application.
  "app",
  "spin",
  "highlight",
  "idle",
  "bootstrap"
],

// Map dependencies from above array.
function(app,Spinner, highlight) {
  function clearFeedBeat(beat){
    clearInterval(beat);
    delete Feed.interval;
  }
  // Create a new module.
  var Feed = app.module();
  Feed.Intervals = {};
  Feed.AddTo = {};
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
      var self = this;
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
      if (this.options.listingId){
        var mod = Feed.listings[this.options.listingId];
        var owner;
        if (this.options.noChangeListing) {
          owner = null;
        } else {
          owner = this.options.comment.id;
        }
        Feed[userId][index].listing = new Feed.Listing({model:mod,owner:owner,
        append: function(root, child) {
            if (self.options.noChangeListing) {
              $(root).append(child);
            } else {
              $($(root).find('li').eq(1)).before(child);
            }
        }
        });
        Feed[userId][index].insertView(Feed[userId][index].listing);
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
         if (!Modernizr.touch) $('a[href="#shout"]').click();
        if (Modernizr.touch) $('a[href="#shout"]').trigger('click');
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
      var userId = this.model.get('userId');
      var index = this.options.index;
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

        if (($(this.el).hasClass('my-comment-sticky') ||
          $(this.el).hasClass('comment-shop-sticky')) &&
          !Feed[userId][index].listing){
          var model = new Feed.Model({});
          var listing = new Feed.Listing({model:model,notAdded:true,
          append: function(root, child) {
            $($(root).find('li').eq(1)).before(child);
          }
          });
          Feed[userId][index].insertView(listing);
          listing.render();
        }

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
    className: 'shop-select',
    template: 'app/templates/layouts/shop-post',
    serialize: function(){
      return this.model.toJSON();
    }

  });

  Feed.Listing = Backbone.View.extend({
    tagName: 'li',
    className: 'listing-sticky sticky',
    template: 'app/templates/layouts/listing-post',
    serialize: function(){
      var mod = this.model.toJSON();
      if (this.options.notAdded) mod.notAdded = true;
      if (this.options.cache) mod.cache = true;
      if (Feed.userId && this.options.owner === Feed.userId) mod.mine = true;
      return mod;
    },
    afterRender: function(){
      if (!Modernizr.touch) $(this.el).find('.add-listing, .add-listing-to, .comment-listing-to').tooltip({placement: 'right'});
      if (!Modernizr.touch) {
        this.$('.mobile').remove();
      } else {
        this.$('.desktop').remove();
      }
      if (this.options.cache){
        $(this.el).addClass('listing-item');
        Feed.rows = $('.search-list').children('li');
        Feed.cache = Feed.rows.map(function(){
          var text = '';
          text = $(this).find('h5').text();
          $('.tags-list>li').each(function(){
            text = text + ' ' + $(this).text();
          });
          $('.styles-list>li').each(function(){
            text = text + ' ' + $(this).text();
          });
          return text;
        });
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
      'mouseenter .post-shout, .post-comment, .add-listing, .add-listing-to, .comment-listing-to': 'iconWhitePostShout',
      'mouseleave .post-shout, .post-comment, .add-listing, .add-listing-to, .comment-listing-to': 'iconBlackPostShout',
      'click .user-posting-section>.sticky>.post-shout': 'postShout',
      'click .add-listing': 'searchListings',
      'click .add-listing-to': 'addListingTo',
      'click .comment-listing-to': 'commentListingTo',
      'click .close-box': 'closeBox',
      'focus .user-shout': 'focusShout',
      'blur .user-shout': 'blurShout',
      'keyup .user-shout': 'checkText',
      'keydown .user-shout': 'checkText',
      'click .my-feed': 'myFeed',
      'keyup .search-box': 'search'
    },
    search: function(e){
      var q = $(e.currentTarget).val().trim().toLowerCase();
      if (this.searchShouts){
        this.filter(q);
      } else {
        this.listingFilter(q);
      }
    },
    searchListings: function(e){
      var userId = $(e.currentTarget).parents('.list-box').attr('user-id');
      var index = $(e.currentTarget).parents('.list-box').attr('message-index');
      if (this.searchShouts) this.searchShouts = false;
      Feed.AddTo.userId = userId;
      Feed.AddTo.index = index;
      if (!Modernizr.touch) $('a[href="#search"]').click();
      if (Modernizr.touch) $('a[href="#search"]').trigger('click');
      $('.search-list').addClass('adding-listing');
    },
    addListingTo: function(e){
      this.addListingPost(e, '/addListing',$('.add-listing-to'), Feed.AddTo.userId, Feed.AddTo.index);
    },
    commentListingTo: function(e){
      this.addListingPost(e, '/listingComment',$('.comment-listing-to'), '', '');
    },
    addListingPost: function(e,url,obj, userId, index){
      var self = this;
      var listing_id = $(e.currentTarget).attr('listing-id');
      var target = $(e.currentTarget).parent()[0];
      var spinner = new Spinner(window.spinnerOpts).spin(target);
      obj.hide();
      $.post(url, {userId: userId, index:index, listingId: listing_id}, function(){
        $('.spinner').remove();
        self.searchShouts = true;
        obj.show();
        if (!Modernizr.touch) $('a[href="#shout"]').click();
        if (Modernizr.touch) $('a[href="#shout"]').trigger('click');
      });
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
      $('.feed-list, .search-list').removeClass('move-down');
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
        $('.feed-list, .search-list').addClass('move-down');
      }
      if ($(e.currentTarget).attr('href') === '#search' && !this.searchShouts){
        $('.search-list').show();
        $('.feed-list').hide();
        clearFeedBeat(Feed.interval);
      } else {
        if (Feed.beat) this.beat(Feed.beat);
        $('.search-list').hide();
        $('.feed-list').show();
        Feed.AddTo.userId = null;
        Feed.AddTo.index = null;
        $('.search-list').removeClass('adding-listing');
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
        $('ul.feed-tabs').addClass('centered-wide');
      } else {
        $('.feed-tab-li>a>span').show();
        $('.feed-tab-li').removeClass('center');
        $('ul.feed-tabs').removeClass('centered-wide');
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
        if (msg.listingId){
          if (!Feed[userId][index].listing){
            var mod = Feed.listings[msg.listingId];
            var owner;
            if (msg.noChangeListing) {
              owner = null;
            } else {
              owner = msg.otherUser.id;
            }
            Feed[userId][index].listing = new Feed.Listing({model:mod,owner:owner,
            append: function(root, child) {
                if (msg.noChangeListing) {
                  $(root).append(child);
                } else {
                  $($(root).find('li').eq(1)).before(child);
                }
            }
            });
            Feed[userId][index].insertView(Feed[userId][index].listing);
            Feed[userId][index].listing.render();
          } else if (msg.listingId !== Feed[userId][index].listing.model.get('listing_id')){
            Feed[userId][index].listing.model = Feed.listings[msg.listingId];
            Feed[userId][index].listing.render();
          }
        }
      } else {

        if (!msg.msg) return false;
        if (!Feed[userId]) Feed[userId] = {};
        if (prepend) {
          Feed[userId][index] = new Feed.ListBox({
            userMessage: new Feed.Model({msg: msg.msg, name: msg.adminName, userId: userId, index:index}),
            comment: msg.otherUser,
            listingId: msg.listingId,
            noChangeListing: msg.noChangeListing,
            append: function(root, child) {
              $(root).prepend(child);
            }
          });
        } else {
          Feed[userId][index] = new Feed.ListBox({
            userMessage: new Feed.Model({msg: msg.msg, name: msg.adminName, userId: userId, index:index}),
            comment: msg.otherUser,
            listingId: msg.listingId,
            noChangeListing: msg.noChangeListing
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
      Feed.interval = setInterval(function(){
        console.log('hi');
        $.get(url, function(data){
          self.moreMessages(data);
          if (self.searchShouts){
            self.updateCache();
          }
        });
      },500);
    },
    listingFilter: function(term){
      var scores = [];
      var self = this;
      if ( !term ) {
        Feed.rows.show();
        Feed.rows.unhighlight();
      } else {
        Feed.rows.hide();
        Feed.rows.unhighlight();
        Feed.cache.each(function(i){
          var score = this.score(term);
          if (score > 0) { scores.push([score, i]); }
        });

        $.each(scores.sort(function(a, b){return b[0] - a[0];}), function(){
          $(Feed.rows[ this[1] ]).show();
          $(Feed.rows[ this[1] ]).highlight(term);
        });
      }
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

        $.each(scores.sort(function(a, b){return b[0] - a[0];}), function(){
          $(self.rows[ this[1] ]).show();
          $(self.rows[ this[1] ]).highlight(term);
        });
      }
    },
    updateCache: function(){
      this.rows = $('.feed-list').children('li');
      this.cache = this.rows.map(function(){
        var text = '';
        $(this).find('.user-messaged').each(function(){
          text = text + ' ' + $(this).text();
        });
        return text;
      });
      if ($('.search-box').val().trim() === ''){
        this.rows.show();
        this.rows.unhighlight();
      }
    },
    updateUserCache: function(data){
      var self = this;
      if (data){
        self.makeListingView(data,true);
      } else {
        $('.search-input').hide();
        $('.loading-list').show();
        $('.close-box').hide();
        if (!Modernizr.touch) $('a[href="#search"]').click();
        if (Modernizr.touch) $('a[href="#search"]').trigger('click');
        $.get('/getListings', function(data){
          $('.search-input').show();
          $('.close-box').show();
          $('.loading-list').remove();
          if (!Modernizr.touch) $('a[href="#shout"]').click();
          if (Modernizr.touch) $('a[href="#shout"]').trigger('click');
          self.makeListingView(data,true);
        });
      }
      
    },
    makeListingView: function(data,cache){
      var self = this;
      Feed.listings = {};
      _.each(data, function(listing){
        var model= new Feed.Model(listing);
        Feed.listings[listing.listing_id] = model;
        var view = new Feed.Listing({model: model, cache:cache});
        self.insertView('.search-list', view);
        view.render();
      });
      $('.search-list').hide();
    },
    afterRender:function(){

      if (!Modernizr.touch) {
        this.$('.mobile').remove();
      } else {
        this.$('.desktop').remove();
      }

      var self = this;

      $(document).idle({
        onIdle: function(){
          clearFeedBeat(Feed.interval);
        },
        onActive: function(){
          console.log(Feed.interval);
          if (!Feed.interval && !$('a[href="#search"]').parent().hasClass('active')) {
            self.beat(Feed.beat);
          }
        },
        events: 'mousemove scroll touchstart keydown',
        idle: 10000
      });
      this.checkWindow();
      $(window).on('resize', this.checkWindow);

      if (this.options.admin || this.options.showShops){
        $('.fb-login').remove();

            if (this.options.admin){
              if (!Modernizr.touch) $('a[href="#shout"]').click();
              if (Modernizr.touch) $('a[href="#shout"]').trigger('click');
              $('.etsy-auth').click(function(){
                
                  $.ajax({
                    type: "POST",
                    url: '/auth',
                    success: function(data){
                      window.location = data;
                    },
                    error: function(){
                      
                    }
                    });
              });
            } else if (this.options.showShops) {
              $('.search-input').hide();
              $('.loading-list').show();
              $('.close-box').hide();
              if (!Modernizr.touch) $('a[href="#search"]').click();
              if (Modernizr.touch) $('a[href="#search"]').trigger('click');
                  $.ajax({
                    type: "GET",
                    url: '/getShops',
                    success: function(data){
                      Feed.userId = data.adminId;
                      $('.etsy-login').remove();
                      $('.shop-info').show();
                      $('.close-box').show();
                      if (!Modernizr.touch) $('a[href="#shout"]').click();
                      if (Modernizr.touch) $('a[href="#shout"]').trigger('click');
                      $('.search-input').show();
                      $('.loading-list').remove();
                      $('.user-posting-section').find('.sticky').addClass('shop-sticky');
                      $('.user-posting-section').show();
                      self.searchShouts = true;
                      setTimeout(function(){
                          Feed.beat = '/adminBeat';
                          self.beat('/adminBeat');
                      },3000);
                      self.updateUserCache(data.listings);
                    },
                    error: function(){
                      
                    }
                    });
            }
              
              
                
      } else {
        $('.etsy-login').remove();
        require( ['facebook-api!appId:' + this.facebook_id], function(FB) {
          self.updateUserCache();
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
              setTimeout(function(){
                  Feed.beat = '/beat';
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
