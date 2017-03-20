define(function (require, exports, module) {
  'use strict'
  const draftsRepo = require('drafts/draftsRepo')
  module.exports = (id, content) => (dispatch) => {
    draftsRepo.update(id, content);
    dispatch({
      type: 'DRAFTS_UPDATE',
      draft: { id, content },
    })
  }
})
