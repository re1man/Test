var express = require('express');
var app = express();
var OAuth= require('oauth').OAuth;
var key = 'mb50qip5zjvd4kf5hzi6u2ke';
var secret = 'e9pfxhlm88';
var domain = "http://brandcast.com";
var callback = ":8000/auth/etsy/callback";
var etsyAuth =  new OAuth(
        "http://openapi.etsy.com/v2/oauth/request_token?scope=email_r%20feedback_r",
        "http://openapi.etsy.com/v2/oauth/access_token",
        key,
        secret,
        "1.0",
        domain + callback,
        "HMAC-SHA1"
    );
var RedisStore = require('connect-redis')(express);
var redis = require("redis"),
userDb = redis.createClient(),
shopDb = redis.createClient(),
listingDb = redis.createClient();
var async = require('async');
var _= require('underscore');
var store = new RedisStore({db:3});


app.use("/assets", express.static(__dirname + '/assets'));
app.use("/app", express.static(__dirname + '/app'));
app.use(express.cookieParser());
app.use(express.bodyParser());
app.use(express.session({ secret: 'Amer1canBe@uty', store: store }));


app.get('/', function(req, res){
	res.sendfile(__dirname + '/index.html');
});
app.get('/admin', function(req, res){
    res.sendfile(__dirname + '/index.html');
});

app.get('/feed', function(req, res){
    getFeed(req,res);
});


app.post('/auth', function(req,res){
    etsyAuth.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results){
        if (error) {
            console.log(error);
            res.send(401);
        } else {
            req.session.oauth = {};
            req.session.oauth.token = oauth_token;
            req.session.oauth.token_secret = oauth_token_secret;
            res.send(results[ "login_url" ]);
    }
    });
});

app.get('/auth/etsy/callback', function(req, res, next){
    if (req.session.oauth) {
        req.session.oauth.oauth_verifier = req.query.oauth_verifier;
        var oauth = req.session.oauth;

        etsyAuth.getOAuthAccessToken(oauth.token,oauth.token_secret,oauth.oauth_verifier,
        function(error, oauth_access_token, oauth_access_token_secret, results){
            if (error){
                console.log(error);
                res.send(404);
            } else {
                req.session.oauth.access_token = oauth_access_token;
                req.session.oauth.access_token_secret = oauth_access_token_secret;
                etsyAuth.getProtectedResource(
                    "http://openapi.etsy.com/v2/private/users/__SELF__", 
                    "GET", 
                    req.session.oauth.access_token, 
                    req.session.oauth.access_token_secret,
                    function (error, data, response) {
                        var dat = JSON.parse(data);
                        var id = dat.results[0].user_id;
                        var name = dat.results[0].login_name;
                        if (!req.session.user){
                            req.session.user = {};
                            req.session.user.id = 'a' + id;
                            req.session.user.name = name;
                        }
                        if(req.session.user.id[0] === 'a'){
                            req.session.user.admin = true;
                        }
                        req.session.user.members = [];
                        res.sendfile(__dirname + '/index.html');
                });
                
            }
        }
        );
    } else
        res.send(404);
});


app.get('/getShops', function(req,res){
    listingDb.get('listings', function(err, listings){
        if (listings){
            var result = {};
            result.listings = JSON.parse(listings);
            result.adminId = req.session.user.id;
            res.send(result);
        } else {
            async.waterfall([
                function(callback){
                    etsyAuth.getProtectedResource(
                    "http://openapi.etsy.com/v2/private/users/__SELF__/shops", 
                    "GET", 
                    req.session.oauth.access_token, 
                    req.session.oauth.access_token_secret,
                    function (error, data, response) {
                        var dat = JSON.parse(data);
                        callback(null, dat);
                    });
                },
                function(shops, callback){
                    var shopIds = [];
                    _.each(shops.results, function(shop){
                        shopIds.push(shop.shop_id);
                    });
                    callback(null, shopIds);
                },
                function(shopIds, callback){
                    var allListings = [];
                    var allListingsClean = [];
                    var index = 0;
                    var _key;
                    function getFirstListing(key, done) {
                        _key = key;
                        etsyAuth.getProtectedResource(
                        "http://openapi.etsy.com/v2/private/shops/"+key+"/listings/active?limit=50&offset=0", 
                        "GET", 
                        req.session.oauth.access_token, 
                        req.session.oauth.access_token_secret,
                        function (error, data, response) {
                            var e = 50;
                            var dat = JSON.parse(data);
                            var offset = dat.count;
                            var count = [];
                            for (var i = 0;e<offset;i++){
                                count[i] = e;
                                e = e + 50;
                            }
                            _.each(dat.results, function(result){
                                allListings.push(result);
                            });
                            async.forEach(count, getListings, function(err) {
                                done();
                            });
                            
                        });
                    }

                    function getListings(offset, done) {
                        etsyAuth.getProtectedResource(
                        "http://openapi.etsy.com/v2/private/shops/"+_key+"/listings/active?limit=50&offset="+offset, 
                        "GET", 
                        req.session.oauth.access_token, 
                        req.session.oauth.access_token_secret,
                        function (error, data, response) {
                            var dat = JSON.parse(data);
                            _.each(dat.results, function(result){
                                allListings.push(result);
                            });
                            done();
                            
                        });
                    }
                    

                    async.forEach(shopIds, getFirstListing, function(err) {
                        _.each(allListings, function(listing){
                            var item = {};
                            item.listing_id = listing.listing_id;
                            item.title = listing.title;
                            item.price = listing.price;
                            item.description = listing.description;
                            item.style = listing.style;
                            item.tags = listing.tags;
                            item.url = listing.url;
                            allListingsClean.push(item);
                        });
                        callback(null, allListingsClean);
                    });
                },
                function(allListingsClean, callback){
                    allListingsFinal = [];
                    function getListingsImage(listing, done) {
                        etsyAuth.getProtectedResource(
                        "http://openapi.etsy.com/v2/private/listings/"+listing.listing_id+"/images", 
                        "GET", 
                        req.session.oauth.access_token, 
                        req.session.oauth.access_token_secret,
                        function (error, data, response) {
                            var dat = JSON.parse(data);
                            listing.image = dat.results[0].url_170x135;
                            allListingsFinal.push(listing);
                            done();
                            
                        });
                    }

                    async.forEach(allListingsClean, getListingsImage, function(err) {
                        callback(null, allListingsFinal);
                    });
                },
                function(allListingsFinal, callback){
                    var _allListingsFinal = JSON.stringify(allListingsFinal);
                    listingDb.set('listings', _allListingsFinal);
                    var result = {};
                    result.adminId = req.session.user.id;
                    result.listings = allListingsFinal;
                    callback(null, result);
                }
            ], function (err, result) {
                if (result === 200){
                    res.send(200);
                }
                if (!err){
                    res.send(result);
                } else {
                    res.send(new Error('There was an error. Please try Again'));
                }
    
            });
        }
    });

});

app.get('/getListings', function(req,res){
    listingDb.get('listings', function(err, listings){
        if (listings){
            var _listings = JSON.parse(listings);
            res.send(_listings);
        }
    });
});

app.post('/userShout', function(req, res){
    if (!req.session.user) res.send(404);
    if (req.body.msg.length > 140){
        res.send(new Error('Message is too long'));
    } else if(!req.session.user){
        res.send(404);
    } else if (req.body.otherUser){
        setUserMessage(req.body.userId, req.body.msg,req, res, req.body.index, req.body.otherUser);
    } else {
        setUserMessage(req.session.user.id, req.body.msg,req, res, req.body.index);
    }
});

app.get('/beat', function(req, res){
    getFeed(req,res);
});

app.get('/adminBeat', function(req, res){
    getFeed(req,res, true);
});



app.post('/logIn', function(req, res){
    if(req.body.id[0] === 'a'){
        res.send(404);
    }
    if (!req.session.user){
        req.session.user = {};
        req.session.user.id = req.body.id;
    }
    
    req.session.user.members = [];
    getFeed(req,res);
});
app.listen(8000);
console.log('starting server');

async.waterfall([
    function(callback){
    	userDb.select(0, callback(null));
    },
    function(callback){
        shopDb.select(1, callback(null));
    },
    function(callback){
        listingDb.select(2, callback(null));
    },
    function(callback){
        callback(null);
    }
], function (err, result) {
    console.log(err);
    
});


function getFeed(req,res, admin){
    async.waterfall([
    function(callback){
            userDb.smembers('users', function(err,keys){
                callback(null, keys);

            });
    },
    function(keys, callback){
        if (keys.length === 0){
            callback(null, 200);
            return false;
        }
        if (req.session.user && req.session.user.admin && keys.length === 0){
            var data = {};
            data.adminId = req.session.user.id;
            callback(null, data);
            return false;
        }
        var allMessages = {};
        allMessages.messages = [];
        function getValues(key, done) {
            var myId = null;
            if (req.session.user) myId = req.session.user.id;
            userDb.hmget(key, 'messages', function(err, msgs){
                var userMessages = {};
                if (key !== myId){
                    userMessages[key] = JSON.parse(msgs);
                    allMessages.messages.push(userMessages);
                } else {
                    allMessages.yourMessages = JSON.parse(msgs);
                }
                done();
            });
        }
        allMessages.allKeys = keys;
        if (req.session.user && req.session.user.admin) allMessages.adminId = req.session.user.id;
        async.forEach(keys, getValues, function(err) {
            callback(null, allMessages);
        });
        
    }
], function (err, result) {
    if (result === 200){
        res.send(200);
    }
    if (!err){
        res.send(result);
    } else {
        res.send(new Error('There was an error. Please try Again'));
    }
    
});
}
function setUserMessage(userId, mess, req, res,index, otherUser){
    async.waterfall([
    function(callback){
        var messages;

        userDb.hmget(userId, 'messages', function(err, msgs){
            messages = msgs;
            callback(null, messages, index, otherUser, req);
        });
        
    },
    function(messages, index,otherUser,req, callback){
        var msgs;
        if (!messages[0]){
            msgs = [];
            userDb.sadd('users', userId);
        } else {
            msgs = JSON.parse(messages);
        }
        if (otherUser && index && msgs[index]){
            
            if (msgs[index].otherUser){
                if (req.session.user && msgs[index].otherUser.id !== req.session.user.id){
                    callback(null, 404, 404);
                } else {
                    msgs[index].otherUser.msg = mess;
                }
            } else {
                msgs[index].otherUser = {};
                msgs[index].otherUser.id = req.session.user.id;
                if (req.session.user && req.session.user.admin) msgs[index].otherUser.adminName = req.session.user.name;
                msgs[index].otherUser.msg = mess;
            }
        } else if (index && msgs[index]) {
            msgs[index].msg = mess;
        } else {
            var _msg = {};
            _msg.msg = mess;
            if (req.session.user && req.session.user.admin) _msg.adminName = req.session.user.name;
            msgs.push(_msg);
            var index = msgs.length - 1;
        }
        var _msgs = JSON.stringify(msgs);
        userDb.hmset(userId, 'messages', _msgs);
        callback(null, msgs, index);
    }
], function (err, result, index) {
    if (!err){
        res.send({msgs: result, index:index});
    } else {
        res.send(new Error('There was an error. Please try Again'));
    }
    
});
}