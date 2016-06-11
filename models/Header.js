'use strict';

let Q = require('Q');

let Row = require('./Row.js');
let Itterator = require('../utils/Itterator.js');

function _Header(data) {
  return {
    getJSON() {
      return data;
    },
    getKey(index) {
      return data[index];
    },
    getCells() {
      let result = []
      for (let i=1; i<data.length; i++) {
        result.push(data[i]);
      }
      return result;
    },
    getItterator() {
      let index = 1;
      return {
        next : function(){
          return data[index++];
        }
      }
    },
    toXLSX(worksheet) {
      let itter = new Itterator(1);
      for (let i=1; i<data.length; i++) {
        let cellId = itter.next();
        worksheet[cellId.key] = { v : data[i] };
      }
    }
  }
}

module.exports = {
  create(data){
    return new _Header(data);
  },
  parse(worksheet) {
    let data = [];
    let itter = new Itterator(1);
    for(let cellId= itter.next(); cellId; cellId = itter.next()) {
      if(!worksheet[cellId.key]) {
        break;
      }
      data[cellId.index] = worksheet[cellId.key].v;
    }

    Row.defaults.forEach(function(value) {
      data.push(value);
    })

    return new _Header(data);
  }
};
