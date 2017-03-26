define(function (require, exports, module) {
  'use strict'
  const drafts_repo = require('drafts/drafts_repo')
  module.exports = (id, content) => (dispatch) => {
    drafts_repo.update(id, content);
    dispatch({
      type: 'DRAFTS_UPDATE',
      draft: { id, content },
    })
  }
})
