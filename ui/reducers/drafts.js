define(function (require, exports, module) {
  'use strict';
  
  module.exports = reduce_drafts;
  
  function reduce_drafts(state = {}, action) {
    switch (action.type) {
      case 'DRAFTS_LOAD':
        return action.drafts;

      case 'DRAFTS_ADD':
      case 'DRAFTS_UPDATE':
        return Object.assign({}, state, {
          [action.draft.id]: action.draft,
        });

      case 'DRAFTS_REMOVE': {
        const next_state = Object.assign({}, state);
        delete next_state[action.draftId];
        return next_state;
      }

      default:
        return state;
    }
  };
});