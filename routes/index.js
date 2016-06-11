'use strict';

let Q = require('Q');
var ObjectId = require('mongodb').ObjectID;

let Doc = require('../models/Doc.js');
let Row = require('../models/Row.js');
let EmptyDoc = require('../utils/EmptyDoc.js');
let Sender = require('../utils/Sender.js')



exports.index = function(req, res) {
  res.render('index', {});
};

exports.send = function(req, res) {
  let username = req.body.username || "";
  let password = req.body.password || "";

  let members = (req.file && req.file.buffer.toString("base64")) || EmptyDoc;
  let message = req.body.message || "";
  let sender = new Sender(username, password);
  let doc = Doc.parse(members);
  
  doc.setMessage(message);
  doc.save().then(function(doc) {
    console.log("SEND - Saved step 1, " + doc.getId());
    return sender.createNumber(doc, req.body.from);
  }).then(function(doc) {
    console.log("SEND - Number created, " + doc.getSender() + " for doc " + doc.getId());
    return doc.save();
  }).then(function(doc) {
    console.log("SEND - Saved step 2, " + doc.getId());
    return sender.send(doc);
  }).then(function(doc){
    console.log("SEND - Message Sent");
    return doc.save();
  }).then(function(doc){
    console.log("SEND - Saved step 3, " + doc.getId());
    res.redirect("/result/" + doc.getId() + "/");
  }).fail(function(err) {
    console.log("SEND - Error, " + err);
    res.status(500);
    res.send();
  });
};

exports.resend = function(req, res) {
  let id = req.params.channel || "";

  let username = req.body.username || "";
  let password = req.body.password || "";
  let sender = new Sender(username, password);

  Doc.load(id).then(function(doc) {
    console.log("RESEND - resending, " + doc.getId());
    return sender.send(doc);
  }).then(function(doc) {
    console.log("RESEND - resending done, " + doc.getId());
    return doc.save();
  }).then(function(doc) {
    console.log("RESEND - Saved, " + doc.getId());
    res.redirect("/result/" + doc.getId() + "/");
  }).fail(function(error) {
    console.log("RESEND - Error, " + error);
    res.status(500);
    res.send();
  });
};

exports.result = function(req, res) {
  let id = req.params.channel || "";
  console.log("RESULT - called, " + id);
  Doc.load(id).then(function(doc) {
    console.log("RESULT - loaded, " + doc.getId());
    res.render('result', {
      message : doc.getMessage(),
      header : doc.getHeader(),
      rows : doc.getRows(),
      id: doc.getId()
    });
  }).fail(function(error) {
    console.log("RESULT - Error, " + error);
    res.status(500);
    res.send();
  });
};

exports.download = function(req, res) {
  let id = req.params.channel || "";
  console.log("DOWNLOAD - Called, " + id);
  Doc.load(id).then(function(doc) {
    console.log("DOWNLOAD - Loaded, " + id);
    res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.end(new Buffer(doc.toXLSX(), 'binary'));
  }).fail(function() {
    console.log("DOWNLOAD - Error, " + error);
    res.status(500);
    res.send();
  });
};

exports.sms = function(req, res) {
  let id = req.params.channel || "";
  let number = req.body.from || "";
  let message = req.body.message || "";

  console.log("SMS - Called for " + id + " and " + number);
  Row.load(id, number).then(function(row) {
    console.log("SMS - Loaded, " + row.getId() + ", " + number);
    row.setReplyMessage(message);
    row.setInDate(new Date());
    row.setStatusAnswered();
    return row.save();
  }).then(function(row) {
    console.log("SMS - Saved, " + row.getId());
    res.send();
  }).fail(function(error) {
    console.log("SMS - Error, " + error);
    res.status(500);
    res.send();
  });
};
