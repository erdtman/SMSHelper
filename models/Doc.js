'use strict';

let XLSX = require('xlsx');
let Q = require('q');
var ObjectId = require('mongodb').ObjectID;

let db = require('../db');
let EmptyDoc = require('../utils/EmptyDoc.js');
let Row = require('./Row.js');
let Header = require('./Header.js');

function _Doc(data, head, rows, id) {
  let me = {
    getId() {
      return id;
    },
    toString() {
      console.log("<document>");
      for(let key in data) {
        console.log(" <" + key +">" + data[key] + "</" + key + ">");
      }
      rows.forEach(function(row) {
        row.toString();
      });
      console.log("</document>");
    },
    save() {
      let deferred = Q.defer();
      let collection = db.get().collection('Doc');
      let doc = {
        header: head.getJSON(),
        data: data,
        _id: id
      };
      collection.save(doc, function(err, saved) {
        if (err) {
          return deferred.reject(new Error(err));
        }

        id = saved._id || doc._id;

        let promises =[];
        rows.forEach(function(row) {
          row.setId(id);
          promises.push(row.save());
        });
        Q.all(promises).then(function() {
          deferred.resolve(me);
        });
      });

      return deferred.promise;
    },
    setMessage(message) {
      data.message = message;
    },
    getMessage() {
      return data.message;
    },
    setSender(sender) {
      data.sender = sender;
    },
    getSender() {
      return data.sender;
    },
    getRows() {
      let result = [];
      rows.forEach(function(row) {
        result.push(row.getCells(head));
      });
      return result;
    },
    getHeader() {
      return head.getCells();
    },
    toXLSX() {
      let workbook = XLSX.read(EmptyDoc, {type: 'base64'});
      let worksheet = workbook.Sheets[workbook.SheetNames[0]];

      head.toXLSX(worksheet);

      let i;
      for (i=0; i<rows.length; i++) {
        rows[i].toXLSX(i+2, worksheet, head);
      }
      worksheet["!ref"]="A1:Z" + (i+1);

      return XLSX.write(workbook, { bookType:'xlsx', bookSST:false, type:'binary' });
    },
    getRowItterator() {
      let index = 0;
      return {
        next : function(){
          return rows[index++];
        }
      }
    },
    getNumberKey(){
      return data.numberKey;
    },
    setNumberKey(numberKey) {
      data.numberKey = numberKey;
    }
  };
  return me;
}

module.exports = {
  load(id) {
    let deferred = Q.defer();
    let collection = db.get().collection('Doc');

    Row.loadRows(id).then(function(rows) {
      collection.findOne({_id:new ObjectId(id)}, function(err, doc) {
        if (err) {
          return deferred.reject(new Error(err));
        }

        if(!doc) {
          return deferred.reject(new Error("Failed to load doc, " + id));
        }

        deferred.resolve(new _Doc(doc.data, Header.create(doc.header), rows, id));
      });
    }).fail(function (err) {
      return deferred.reject(new Error(err));
    });

    return deferred.promise;
  },
  parse(data) {
    let head;
    let rows = [];

    let workbook = XLSX.read(data, {type: 'base64'});
    let worksheet = workbook.Sheets[workbook.SheetNames[0]];

    head = Header.parse(worksheet);

    for(let i=2;;i++) {
      let row = Row.parse(worksheet, i, head);
      if(!row) {
        break;
      }
      rows.push(row);
    }
    return new _Doc({}, head, rows);
  }
}
