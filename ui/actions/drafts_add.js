define(function (require, exports, module) {
  'use strict'
  const drafts_repo = require('drafts/drafts_repo')
  module.exports = content => dispatch => {
    dispatch({
      type: 'DRAFTS_ADD',
      draft: drafts_repo.create(content),
    })
  }
})
