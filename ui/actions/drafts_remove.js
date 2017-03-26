define(function (require, exports, module) {
  'use strict'
  const drafts_repo = require('drafts/drafts_repo');
  module.exports = id => dispatch => {
    drafts_repo.remove(id)
    dispatch({
      type: 'DRAFTS_REMOVE',
      draftId: id,
    })
  }
})
