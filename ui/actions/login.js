

import sql_query from '../api/sql_query.js';
import md5 from '../lib/md5.js';

export default ({ user, password }) => dispatch => {

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
        treenode_id: [datname, 'database', datname],
        comment: comment,
        group: 0,
      })),
    });
    window.codemirror.refresh();
  }, ({ message }) => dispatch({
    type: 'LOGIN_FAIL',
    error: message,
  }));
};
