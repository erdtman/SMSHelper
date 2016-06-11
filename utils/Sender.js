'use strict';

let Q = require('Q');
let request = require('superagent');

module.exports = function(username, password) {
  username = username.trim();
  password = password.trim();

  function send(doc, row) {
    let deferred = Q.defer();
    console.log("SENDER - sending message to " + row.getNumber() + " from " + doc.getSender());
    request.post("https://api.46elks.com/a1/SMS").type('form').send({
      message : doc.getMessage(),
      from : doc.getSender(),
      to : row.getNumber()
    }).auth(username, password).end(function(err, cres) {
      if (err) {
        return deferred.reject(new Error(err));
      }

      if(cres.status != 200) {
        row.setStatusFailed();
        return deferred.reject(new Error("Bad response status, " + cres.status));
      }

      row.setStatusSent();
      row.setOutDate(new Date());
      deferred.resolve();
    });
    return deferred.promise;
  }

  return {
    send(doc) {
      let deferred = Q.defer();
      let promises =[];
      let ri = doc.getRowItterator();
      for(let row = ri.next(); row; row = ri.next()) {
        if(row.isAnswered()) {
          console.log("SENDER - skipping " + row.getNumber());
          continue;
        }
        promises.push(send(doc, row));
      }

      Q.allSettled(promises).then(function() {
        deferred.resolve(doc);
      });
      return deferred.promise;
    },
    createNumber(doc, sender) {
      let deferred = Q.defer();

      if(sender) {
        console.log("CREATE_NUMBER - Has sender, " + sender + ", skipping to create number for " + doc.getId());
        doc.setSender(sender);
        deferred.resolve(doc);
        return deferred.promise;
      }

      console.log("CREATE_NUMBER - Creating number for " + doc.getId());
      request.post("https://api.46elks.com/a1/Numbers").type('form').send({
        country : "se",
        sms_url : "http://damp-lowlands-1177.herokuapp.com/result/" + doc.getId()
      }).auth(username, password).end(function(err, cres) {
        if (err) {
          return deferred.reject(new Error(err));
        }

        if(cres.status != 200) {
          return deferred.reject(new Error("bad status in response: " + cres.status));
        }

        var body = JSON.parse(cres.text);
        doc.setSender(body.number);
        deferred.resolve(doc);
      });

      return deferred.promise;
    }
  };
}
