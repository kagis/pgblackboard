define(function (require, exports, module) {
  'use strict'
  const draftsRepo = require('drafts/draftsRepo');
  module.exports = id => dispatch => {
    draftsRepo.remove(id)
    dispatch({
      type: 'DRAFTS_REMOVE',
      draftId: id,
    })
  }
})
