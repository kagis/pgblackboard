import linecol from './linecol.js';
// const { expect } = require('');

it('linecol', () => {
  expect(linecol('one\ntwo\r\nthree')).to.eql({ line: 2, col: 6 });
});
