var request = require('superagent');
var mongoose = require('mongoose');
var _ = require('underscore');
mongoose.connect("mongodb://heroku_app36875731:q6kgjp65041vc6u6koq3rm5icm@ds031912.mongolab.com:31912/heroku_app36875731" || process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'mongodb://localhost/test');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback() {
  console.log("connected to mongodb using mongoose");
});
var Schema = mongoose.Schema;
var ObjectIdSchema = Schema.ObjectId;
var Channel = mongoose.model('Channel', {
  _id : {
    type : ObjectIdSchema,
    "default" : function() {
      return new mongoose.Types.ObjectId();
    }
  },
  message : String,
  from : String
});

var Reply = mongoose.model('Reply', {
  channel : String,
  message : String,
  from : String,
  fromFirstName : String,
  fromLastName : String,
  fromPNr : String,
  nr : Number,
  status : Number,
  deliveryMessage : String,
  sent : Date,
  received : Date
});

exports.index = function(req, res) {
  res.render('index', {});
};

function send(from, message, reply, username, password) {
  console.log("sending to " + reply.from);
  request.post("https://api.46elks.com/a1/SMS").type('form').send({
    message : message,
    from : from,
    to : reply.from
  }).auth(username.trim(), password.trim()).end(function(err, cres) {
    if (err) {
      return console.error(err);
    }

    console.log("update " + reply.from + ", delivery status" + cres.body.status);

    Reply.update({
      _id : reply._id
    }, {
      $set : {
        message : '<waiting>',
        deliveryMessage : cres.text,
        status : cres.status,
        sent : new Date()
      }
    }, function(err, res) {
      if (err) {
        return console.error(err);
      }
      console.log("updated " + reply.from);
    });
  });
}


var LAST_NAME = 0;
var FIRST_NAME = 1;
var P_NR = 2;
var PHONE_NR = 3;


function process(rows, username, password, channel){
  var index = 0;
  var timer = setInterval(function() {
      var row = rows[index++].trim().split(";");

      if(row.length <= PHONE_NR) {
        console.log("skipping row '" + rows[index++].trim() + "'");
        return;
      }

      if (index >= rows.length) {
        console.log("No more rows to process");
        clearTimeout(timer);
      }

      var reply = new Reply({
        channel : channel._id,
        message : "<sending>",
        from : row[PHONE_NR].trim(),
        fromFirstName : row[FIRST_NAME].trim(),
        fromLastName : row[LAST_NAME].trim(),
        fromPNr : row[P_NR].trim(),
        send : new Date(),
        nr : index
      });

      console.log(reply);
      console.log("saving to " + reply.from);


      reply.save(function(err, savedReply) {
        if (err) {
          return console.error(err);
        }
        if (reply.form === "") {
          return console.log("skipping send to empty number");
        }
        send(channel.from, channel.message, savedReply, username, password);
      });
    }, 100);
}

function createNumber(url, username, password, callback) {
  console.log("creating number for " + url);
  request.post("https://api.46elks.com/a1/Numbers").type('form').send({
    country : "se",
    sms_url : url
  }).auth(username.trim(), password.trim()).end(function(err, cres) {
    if (err) {
      return callback(err);
    }

    console.log(cres.text);

    if(cres.status != 200) {
     return callback("bad status in response: " + cres.status); 
    }

    var body = JSON.parse(cres.text);

    return callback(false, body.number);
  });
}

exports.send = function(req, res) {
  var channel = new Channel({
    message : req.body.message,
    from : req.body.from.trim()
  });

  channel.save(function(err, savedChannel) {
    if (err) {
      res.status(500);
      res.send();
      return console.error(err);
    }

    var rows = req.body.numbers.split("\n")

    if(savedChannel.from == "") {
      createNumber("https://" + req.hostname + "/result/" + savedChannel._id , req.body.username, req.body.password, function(error, number) {
        savedChannel.from = number;
        savedChannel.update(function(err, uppdatedChannel) {
          if (err) {
            return console.error("uppdate error");
            return console.error(err);
          }
          process(rows, req.body.username, req.body.password, uppdatedChannel);  
        });
      });
    } else {
      process(rows, req.body.username, req.body.password, savedChannel);
    }

    res.redirect("/result/" + savedChannel._id);
  });
};

exports.result = function(req, res) {
  var query = {
    _id : new mongoose.Types.ObjectId(req.params.channel)
  };
  Channel.find().where(query).exec(function(err, channels) {
    if (err) {
      res.status(500);
      res.send();
      return console.log(err);
    }
    if (channels.length !== 1) {
      res.status(404);
      res.send();
      return console.log("ambigious channel");
    }

    Reply.find().where({
      channel : channels[0]._id
    }).sort("nr").exec(function(err, replies) {
      if (err) {
        res.status(500);
        res.send();
        return console.log(err);
      }

      res.render('result', {
        channel : channels[0],
        replies : replies
      });
    });
  });
};

exports.resend = function(req, res) {
  var query = {
    _id : new mongoose.Types.ObjectId(req.params.channel),
  };
  Channel.find(query, function(err, channels) {
    if (err) {
      res.status(500);
      res.send();
      return console.log(err);
    }
    if (channels.length !== 1) {
      res.status(404);
      res.send();
      return console.log("ambigious channel");
    }
    var channel = channels[0];
    Reply.find({
      channel : channel._id,
      message : "<waiting>",
    }, function(err, replies) {
      if (err) {
        res.status(500);
        res.send();
        return console.log(err);
      }

      var index = 0;
      var timer = setInterval(function() {
        var reply = replies[index++];
        if (reply.message !== "<waiting>") {
          return;
        }

        if(index >= replies.length) {
          console.log("Nothing more to resend");
          clearTimeout(timer);
        }

        console.log("Resending for real: " + reply.status + ": " + reply.from);
        send(channel, reply, req.body.username, req.body.password);
      }, 100);
      
      res.redirect("/result/" + channel._id);
    });
  });
};

exports.sms = function(req, res) {
  var query = {
    _id : new mongoose.Types.ObjectId(req.params.channel),
  };
  Channel.find(query, function(err, channels) {
    if (err) {
      res.status(500);
      res.send();
      return console.log(err);
    }
    if (channels.length !== 1) {
      res.status(404);
      res.send();
      return console.log("ambigious channel");
    }

    console.log("Reply from: " + req.body.from + ", message: '" + req.body.message + "'");

    Reply.update({
      channel : channels[0]._id,
      from : req.body.from
    }, {
      $set : {
        message : req.body.message,
        received : new Date()
      }
    }, function(err, reply) {
      if (err) {
        res.status(500);
        res.send();
        return console.error(err);
      }
      res.send();
    });
  });
};