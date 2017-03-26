define(function (require, exports, module) {
  'use strict';
  
  const drafts_repo = require('../drafts/drafts_repo');
  
  module.exports = () => ({
    type: 'DRAFTS_LOAD',
    drafts: drafts_repo.get_all(),
  });

});