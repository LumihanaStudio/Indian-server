var express = require('express');
var mongoose = require('mongoose');
var serveStatic = require('serve-static');
var socket = require('socket.io');
var app = express();
var server = require('http').Server(app);
var https = require('https');
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({
    extended: true
}));
var randomString = require('randomstring');
var cookieParser = require('cookie-parser');
var cookie = require('cookie');
app.use(cookieParser());
var session = require('express-session');
var sessionStore = require('sessionstore');
var multer = require('multer');
var fs = require('fs');
var autoComplete = require('autocomplete');
var mime = require('mime');
var io = socket.listen(server);
store = sessionStore.createSessionStore();
app.use(serveStatic(__dirname, ({
    'index': false
})));
var storage = multer.diskStorage({
	destination : function(req,file,cb){
		cb(null, './uploads')
	},
	filename : function(req, file, cb){
		cb(null, file.originalname)
	}
});
var upload = multer({storage : storage})
app.use(session({
    store: store,
    secret: 'indian',
    cookie: {
        path: '/',
        expires: false
    }
}));

var data_base = mongoose.connection;
mongoose.connect("mongodb://localhost:27017/indian", function(err) {
    if (err) {
        console.log("MongoDB Error!");
        throw err;
    }
});
var schema = mongoose.Schema;
var userSchema = new schema({
    id: {
        type: String
    },
    password: {
        type: String
    },
    name: {
        type: String
    },
    accountType: {
        type: String
    },
    nickname: {
        type: String
    },
    user_apiKey: {
        type: String
    }
})
var gameSchema = new schema({
    _id: {
        type: String
    },
    writer: {
        type: String
    },
    gameName: {
        type: String
    },
    writeTime: {
        type: Date
    },
    picture_src: {
        type: Array
    },
    content: {
        type: String
    },
    tag: {
        type: Array
    },
    launch_date: {
        type: String
    },
    average_score: {
        type: Number
    }
});

var reviewSchema = new schema({
    _id: {
        type: String
    },
    writer: {
        type: String
    },
    gameName: {
        type: String
    },
    writeTime: {
        type: Date
    },
    review_game : {
      type : String
    },
    review_score: {
        type: Number
    },
    content: {
        type: String
    }
});
var Game = mongoose.model('game', gameSchema);
var Review = mongoose.model('review', reviewSchema);
var User = mongoose.model('user', userSchema);
server.listen(80);
console.log("Server Running At Port 8000");
require('./oauth')(app);

//로그인
app.get('/login', function(req, res) {
    res.sendFile(__dirname + "/index.html");
});

app.get('/view/:id', function(req,res){
	var img = fs.readFileSync('./uploads/'+req.param('id'));
	res.writeHead(200, {'Content-Type' : mime.lookup('./uploads/'+req.param('id'))})
	res.end(img, 'binary');
})

app.post('/auth/login', function(req, res) {
    User.update({
      id : req.param('id')
    }, {
      user_apiKey : randomString.generate(15)
    }, function(err, result){
      if(err){
        res.send(502, "Server Error");
        console.log(err);
        throw err;
      }
      console.log("User APi Key Generated");
      console.log(result);
    });

    User.findOne({id : req.param('id'), password : req.param('password')},
 function(err, result){
      if (err){
        res.send(502, "Server Error");
        console.log(err);
        throw err;
      }
      if(result == null){
        res.send(403, "Login Failed");
      }
      else{
        res.send(200, result);
      }
    })
})

app.post('/auth/register', function(req, res) {
    var sign = new User();
    sign.id = req.param('id');
    sign.password = req.param('password');
    sign.nickname = req.param('nickname');
    sign.name = req.param('name');
    sign.accountType = req.param('account');
    User.find({
        'id': req.param('id')
    }, function(err, signFind) {
        if (err) {
            res.send(502, "Server Error");
            console.err(err);
            throw err;
        } else if (signFind.length != 0) {
            res.send(409, "계정 생성에 실패하였습니다!");
        } else if (signFind.length == 0) {
            sign.save(function(err, silence) {
                if (err) {
                    console.log(err);
                    throw err;
                }
                console.log(sign);
                res.send(200, sign);
            })
        }
    });
});

app.post('/auth/authenticate', function(req, res){
  User.findOne({
      user_apiKey: req.param('key')
  }, function(err, result) {
      if (err) {
          res.send(502, "Server Error");
          console.log(err);
          throw err;
      }
      if(result == null){
        res.send(403, "Login Failed");
      }
      else{
      res.send(200, result);
    }
  });
})


//게임 등록
app.post('/gameregister', upload.array('gameFiles', 12), function(req, res) {
    var game = new Game();
    game.writer = req.param('writer');
    game.writeTime = new Date();
    game._id = randomString.generate(15);
    game.gameName = req.param('gamename');
    game.picture_src = req.files;
    game.content = req.param('content');
    game.tag = req.param('tag').split(':');
    game.launch_date = req.param('launch_date');
    game.average_score = 0;
    if (game.content != null) {
        game.save(function(err, silence) {
            if (err) {
                res.send(400, "Failed")
                console.log(err);
                throw err;
            }
        });
        console.log(game);
        res.send(200, game);
    }
});

//리뷰 등록
app.post('/reviewregister', function(req, res) {
    var review = new Review();
    review.writer = req.param('writer');
    review.writeTime = new Date();
    review.review_game= req.param('gamename');
    review.review_score = req.param('score');
    review._id = randomString.generate(15);
    review.content = req.param('content');
    if (review.content != null) {
        review.save(function(err, silence) {
            if (err) {
                res.send(400, "Failed");
                console.log(err);
                throw err;
            }
        });
        console.log(review);
        res.send(200, review);
    }
});

//리뷰 리스트
app.post('/reviewlist', function(req, res) {
    var sum = 0
    var average;
    Review.find({
        review_game: req.param('gamename')
    }, function(err, result) {
        if (err) {
            res.send(400, "Failed");
            console.log(err);
            throw err;
        }
        for (var i = 0; i < result.length; i++) {
            sum += result[i].review_score;
            console.log(sum);
        }
        average = sum / result.length;
        console.log(average)
        Game.update({
            gameName: req.param('gamename')
        }, {
            average_score: average
        }, function(err, result) {
            if (err) {
                console.log(err);
                throw err;
            }
            console.log("Updated successfully");
            console.log(result);
        });

        res.send(200, result);
    });
});

//게임 리스트
app.post('/gamelist', function(req, res) {
    Game.find({}, function(err, result) {
        if (err) {
            res.send(400, "Failed");
            console.log(err);
            throw err;
        }
        res.send(200, result);
    });
});

//게임 조회
app.post('/gamelist/:gameid', function(req, res) {
    console.log(req.param('gameid'));
    Game.findOne({
        _id: req.param('gameid')
    }, function(err, result) {
        if (err) {
          res.send(400, failed);
            console.log(err);
            throw err;
        }
        res.send(200, result);
    });
});

//일반 검색
app.post('/search', function(req, res) {
    var data = [];
    Game.find({}, function(err, result) {
        if (err) {
            res.send(400, "Failed");
            console.log(err);
            throw err;
        }
        for (var i = 0; i < result.length; i++) {
            if (result[i].gameName.indexOf(req.param('query')) != -1) {
                data.push(result[i]);
            }
        }
        console.log(data);
        res.send(200, data);
    })
})

//태그 검색
app.post('/tagsearch', function(req, res) {
    var data = [];
    var tagArr = req.param('tag').split(',');
    Game.find({}, function(err, result) {
        if (err) {
            res.send(400, "Failed")
            console.log(err);
            throw err;
        }
        for (var i = 0; i < result.length; i++) {
            console.log(result[i].tag.indexOf);
            if (result[i].tag.indexOf(req.param('tag').split(',')) != -1) {
                data.push(result[i]);
            }
        }
        console.log(data);
        res.send(200, data);
    })
})

app.post('/currentreview', function(req, res) {
    var contentArr = [];
    Review.find({}, function(err, result) {
        if (err) {
            res.send(400, "Failed")
            console.log(err);
            throw err;
        }
        for (var i = 0; i < 4; i++) {
            console.log(result[i])
            contentArr.push(result[i]);
        }
        res.send(200, contentArr);
    }).sort({
        writeTime: -1
    });
})
