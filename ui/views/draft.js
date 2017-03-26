define(function (require, exports, module) {
  'use strict';
  const el = require('../core/el');
  const dispatch = require('../core/dispatch');
  const drafts_remove = require('../actions/drafts_remove');

  module.exports = ({ isSelected, draft }) => (
    el('div.draft'
      ,isSelected && el.class('draft--selected')
      ,el('a.draft__title'
        ,el.on('click', _ => dispatch({
          type: 'DRAFTS_SELECT',
          draft_id: draft.id,
        }))
  
        ,el('i.draft__icon')
        ,el('span', getDraftTitle(draft.content))
      )
      ,el('button.draft__remove'
        ,el.on('click', _ => dispatch(drafts_remove(draft.id)))
        ,'remove'
      )
    )
  );

  function getDraftTitle(sqlScript) {
    var sqlScript = sqlScript.trim()
    var m = /\\connect\s+\w+\s*([\s\S]+)/.exec(sqlScript)
    if (m) {
      sqlScript = m[1];
    }
    m = /^create\s+(or\s+replace\s+)?([\s\S]+)/i.exec(sqlScript)
    if (m) {
      sqlScript = m[2];
    }

    return sqlScript.substr(0, 100) || '(empty)';
  }

  // on('.myQuery__title', 'click', function handleMyQueryClick(e) {
  //   dispatch({
  //     type: 'MYQUERY_SELECT',
  //     myQueryId: this.dataset.id
  //   });
  // });
  //
  // on('.myQuery__remove', 'click', function handleMyQueryRemoveClick(e) {
  //   dispatch({
  //     type: 'MYQUERY_REMOVE',
  //     myQueryId: this.dataset.id
  //   });
  // });

});
