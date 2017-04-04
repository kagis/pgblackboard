define(function (require, exports, module) {
  'use strict';
  const sql_query = require('../api/sql_query');
  const md5 = require('../md5');
  
  module.exports = ({ user, password }) => dispatch => {
    
    const md5password = md5(password + user);
    
    dispatch({
      type: 'LOGIN_START',
    });
    
    sql_query({
      database: 'postgres', // 'postgres',
      credentials: {
        user,
        password: md5password,
      },
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
        password: md5password,
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
    }).catch(({ message }) => dispatch({
      type: 'LOGIN_FAIL',
      error: message,
    }));
}; 
});