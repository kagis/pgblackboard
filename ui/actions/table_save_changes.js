define(function (require, exports, module) {
  'use strict'

  const modificationScript = require('../table/modificationScript')
  const sql_query = require('../api/sql_query')

  module.exports = () => (dispatch, state) => {
    const { execOutput, credentials } = state;
    const script = modificationScript(execOutput);
    console.log(script)
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
