define(function (require, exports, module) {
  'use strict'

  const modification_script = require('../table/modification_script')
  const sql_query = require('../api/sql_query')

  module.exports = () => (dispatch, state) => {
    const { output, credentials } = state;
    const script = modification_script(output.items);
    console.log(script);
    if (script.length) {
      sql_query({
        statements: script,
        database: 'ubuntu',
        password: credentials.password,
        user: credentials.user,
      })
    }
  }

})
