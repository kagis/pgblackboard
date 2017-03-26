define(function (require, exports, module) {
  'use strict'
  
  const stripCommentsOnStart = require('./stripCommentsOnStart.js')
  
  describe('stripCommentsOnStart', function () {
    it('should strip block comment.', function () {
      expect(stripCommentsOnStart('/*comment*/select')).to.eql('select')
    })
    it('should strip line comment.', function () {
      expect(stripCommentsOnStart('--comment\nselect')).to.eql('select')
    })
    it('should strip whitespaces.', function () {
      expect(stripCommentsOnStart(' \t\nselect')).to.eql('select')
    })
    it('should strip comments and whitespaces', function () {
      expect(stripCommentsOnStart(' /*comment*/ \n--comment\n select'))
        .to.eql('select')
    })
  })
})