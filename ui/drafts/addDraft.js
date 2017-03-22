define(function (require, exports, module) {
  'use strict'
  const draftsRepo = require('./draftsRepo')
  module.exports = content => dispatch => {
    dispatch({
      type: 'DRAFTS_ADD',
      draft: draftsRepo.create(content),
    })
  }
})
