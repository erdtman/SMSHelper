'use strict';

module.exports = function (row){
  let alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let index = 0;
  return {
    next(){
      if (index >= alphabet.length ) {
        return;
      }
      return { key: "" + alphabet.charAt(index++) + row,
               index: index};
    }
  }
}
