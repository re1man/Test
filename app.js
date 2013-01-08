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
app.get('/admin', function(req, res){
    res.sendfile(__dirname + '/index.html');
});
app.get('/feed', function(req, res){
    getFeed(req,res);
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

app.post('/adminLogIn', function(req, res){
    if (!req.session.user){
        req.session.user = {};
        req.session.user.id = 'a' + req.body.id;
        req.session.user.name = "John Smith";
    }
    if(req.session.user.id[0] === 'a'){
        req.session.user.admin = true;
    }
    req.session.user.members = [];
    getFeed(req,res, req.session.user.admin);
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
        if (req.session.user.admin && keys.length === 0){
            var data = {};
            data.adminId = req.session.user.id;
            callback(null, data);
            return false;
        }
        if (keys.length === 0){
            callback(null, 200); 
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
        if (req.session.user.admin) allMessages.adminId = req.session.user.id;
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
                if (msgs[index].otherUser.id !== req.session.user.id){
                    callback(null, 404, 404);
                } else {
                    msgs[index].otherUser.msg = mess;
                }
            } else {
                msgs[index].otherUser = {};
                msgs[index].otherUser.id = req.session.user.id;
                if (req.session.user.admin) msgs[index].otherUser.adminName = req.session.user.name;
                msgs[index].otherUser.msg = mess;
            }
        } else if (index && msgs[index]) {
            msgs[index].msg = mess;
        } else {
            var _msg = {};
            _msg.msg = mess;
            if (req.session.user.admin) _msg.adminName = req.session.user.name;
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