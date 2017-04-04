define(function (require) {
  'use strict';
  
  const linecol = require('./linecol');
  // const { expect } = require('');
  
  it('linecol', () => {
    expect(linecol('one\ntwo\r\nthree')).to.eql({ line: 2, col: 6 });
  });

});