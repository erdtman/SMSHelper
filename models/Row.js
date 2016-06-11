'use strict';

let Q = require('Q');
var ObjectId = require('mongodb').ObjectID;

let db = require('../db');
let Itterator = require('../utils/Itterator.js');

let STATUS = {
  INITIAL: "STATUS_INITIAL",
  SENT: "STATUS_SENT",
  ANSWERD: "STATUS_ANSWERD",
  FAILED: "STATUS_FAILED"
}

String.prototype.trimLeft = function(charlist) {
  return this.replace(new RegExp("^[" + charlist + "]+"), "");
};

function _Row(data) {
  let me = {
    toString(db) {
      console.log(" <row>")
      for(let key in data) {
        console.log("  <" + key +">" + data[key] + "</" + key + ">");
      }
      console.log(" </row>");
    },
    save() {
      let deferred = Q.defer();
      let collection = db.get().collection('Row');

      collection.save(data, function(err, saved) {
        if (err) {
          return deferred.reject(new Error(err));
        }
        deferred.resolve(me);
      });
      return deferred.promise;
    },
    setId(id) {
      data.channel = id + "";
    },
    getId() {
      return data.channel;
    },
    getCells(head) {
      let result = [];
      let hItter = head.getItterator();
      for (let header = hItter.next(); header; header = hItter.next()) {
        result.push(data[header] )
      }
      return result;
    },
    setReplyMessage(replyMessage) {
      data.replyMessage = replyMessage;
    },
    setReply(reply) {
      data.reply = reply;
    },
    setOutDate(outDate) {
      data.outDate = outDate;
    },
    setInDate(inDate) {
      data.inDate = inDate;
    },
    getNumber() {
      return data.number;
    },
    setStatusAnswered() {
      data.status = STATUS.ANSWERD;
    },
    setStatusSent() {
      data.status = STATUS.SENT;
    },
    setStatusFailed() {
      data.status = STATUS.FAILED
    },
    isAnswered() {
      return data.status === STATUS.ANSWERD;
    },
    toXLSX(row, worksheet, head) {
      let itter = new Itterator(data.index);
      let hItter = head.getItterator();
      for (let header = hItter.next(); header; header = hItter.next()) {
        let cellId = itter.next();
        worksheet[cellId.key] = { v : data[header] };
      }
    }
  };
  return me;
}

module.exports = {
  defaults : ["replyMessage","outDate", "inDate", "status"],
  load(id, number) {
    let deferred = Q.defer();
    var collection = db.get().collection('Row');
    collection.findOne({channel:id, number:number}, function(err, doc) {
      if (err) {
        return deferred.reject(new Error(err));
      }
      if(!doc) {
        return deferred.reject(new Error("Did not find number ''" + number + "' for channel '" + id + "'"));
      }

      deferred.resolve(new _Row(doc));
    });
    return deferred.promise;
  },
  loadRows(id){
    let deferred = Q.defer();
    var collection = db.get().collection('Row');
    collection.find({channel:id}).toArray(function(err, docs) {
      if (err) {
        return deferred.reject(new Error(err));
      }

      if(!docs) {
        return deferred.reject(new Error("Did not find numbers for id ''" + id + "'"));
      }

      let rows = [];
      docs.forEach(function(doc) {
        rows.push(new _Row(doc));
      });
      deferred.resolve(rows);
    });
    return deferred.promise;
  },
  parse(worksheet, index, header) {
    let data = {
      status: STATUS.INITIAL,
      index: index
    };
    let empty = true;
    let itter = new Itterator(index);
    for(let cellId = itter.next(); cellId; cellId = itter.next()) {
      if(!worksheet[cellId.key]) {
        break;
      }
      empty = false;

      let head = header.getKey(cellId.index);
      let value = worksheet[cellId.key].v;

      if(head == "number") {
        value = value + "";
        value = value.replace(new RegExp("-", 'g'),"");
        value = value.replace(new RegExp(" ", 'g'),"");
        value = value.trimLeft("0");
        value = value.trimLeft("+46");
        value = value.trimLeft("0046");
        value = "+46" + value;
      }

      data[head] = value;
    }

    if(empty) {
      return;
    }

    return new _Row(data);
  }
}
