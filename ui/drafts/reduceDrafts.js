define(function (require, exports, module) {
  'use strict'
  
  module.exports = (state, action) => {
    switch (action.type) {
      case 'INIT':
        return {}

      case 'DRAFTS_LOAD':
        return action.drafts

      case 'DRAFTS_ADD':
      case 'DRAFTS_UPDATE':
        return Object.assign({
          [action.draft.id]: action.draft,
        }, state)

      case 'REMOVE_MYQUERY': {
        const nextState = Object.assign({}, state)
        delete nextState[action.draftId]
        return nextState
      }

      default:
        return state
    }
  }
})