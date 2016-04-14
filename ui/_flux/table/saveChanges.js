define(function (require, exports, module) {
  'use strict'

  const modificationScript = require('./modificationScript')
  const sqlQuery = require('webapi/sqlQuery')

  module.exports = saveChanges

  function saveChanges(execOutput) {
    return function (dispatch) {
      const script = modificationScript(execOutput);
      console.log(script)
      if (script) {
        sqlQuery({
          statement: script,
          password: 'postgres',
          database: 'postgres',
          user: 'postgres',
        })
      }
    }
  }

})
