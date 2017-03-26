define(function (require, exports, module) {
  'use strict';
  
  const sql_query = require('../api/sql_query');
  
  module.exports = ({ user, password }) => dispatch => {
    
    dispatch({
      type: 'LOGIN_START',
      user,
      password,
    });
    
    sql_query({
      database: 'postgres', // 'postgres',
      user,
      password,
      statements: [`
        SELECT      datname
                  , shobj_description(oid, 'pg_database')
        FROM      pg_database
        WHERE     NOT datistemplate
        ORDER BY  datname
      `],
    }).then(([{ rows: nodes }]) => {
      dispatch({
        type: 'LOGIN_SUCCESS',
        user,
        password,
        treenodes: nodes.map(([datname, comment]) => ({
          typ: 'database',
          name: datname,
          can_have_children: true,
          path: [datname, 'database', datname],
          comment: comment,
          group: 0,
        })),
      });
      window.codemirror.refresh();
    })
}; 
});