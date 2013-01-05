var express = require('express');
var app = express();
var OAuth= require('oauth').OAuth;
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
app.get('/feed', function(req, res){
    getFeed(req,res);
});
app.post('/userShout', function(req, res){
    if (req.body.msg.length > 140){
        res.send(new Error('Message is too long'));
    } else if(!req.session.user){
        res.send(404);
    } else {
        setUserMessage(req.session.user.id, req.body.msg, res, req.body.index);
    }
});

app.get('/beat', function(req, res){
    getFeed(req,res);
});


app.post('/logIn', function(req, res){
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


function getFeed(req,res){
    async.waterfall([
    function(callback){
            userDb.smembers('users', function(err,keys){
                callback(null, keys);

            });
    },
    function(keys, callback){
        if (keys.length === 0) callback(null, 200);
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
function setUserMessage(userId, mess, res,index){
    async.waterfall([
    function(callback){
        var messages;
        userDb.hmget(userId, 'messages', function(err, msgs){
            messages = msgs;
            callback(null, messages, index);
        });
        
    },
    function(messages, index, callback){
        var msgs;
        if (!messages[0]){
            msgs = [];
            userDb.sadd('users', userId);
        } else {
            msgs = JSON.parse(messages);
        }
        if (index) {
            msgs[index].msg = mess;
        } else {
            var _msg = {};
            _msg.msg = mess;
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