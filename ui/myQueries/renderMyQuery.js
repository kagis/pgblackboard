csslink('./myQuery.css');

define(function (require, exports, module) {
  const el = require('core/el');
  const dispatch = require('core/dispatch');
  const removeMyQuery = require('./removeMyQuery');
  // var on = require('on');

  module.exports = renderMyQuery;

  function renderMyQuery(params) {
    return el('div.myQuery'
      ,params.isSelected && el.class('myQuery--selected')
      ,el('a.myQuery__title'
        ,el.on('click', _ => dispatch({
          type: 'MYQUERY_SELECT',
          myQueryId: params.myQuery.id
        }))

        ,el('i.myQuery__icon')
        ,el('span', getMyQueryTitle(params.myQuery.content))
      )
      ,el('button.myQuery__remove'
        ,el.on('click', _ => dispatch(removeMyQuery(params.myQuery.id)))
        ,'remove'
      )
    );
  }

  function getMyQueryTitle(sqlScript) {
    var sqlScript = sqlScript.trim();
    var m = /\\connect\s+\w+\s*([\s\S]+)/.exec(sqlScript);
    if (m) {
      sqlScript = m[1];
    }
    m = /^create\s+(or\s+replace\s+)?([\s\S]+)/i.exec(sqlScript);
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
