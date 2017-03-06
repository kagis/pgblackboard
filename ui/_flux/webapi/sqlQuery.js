define(function (require, exports, module) {
  'use strict';

  const sqlStream = require('./sqlStream')

  module.exports = sqlQuery

  function sqlQuery({
    statement,
    user,
    password,
    database,
    fields,
  }) {
    return new Promise(function (resolve, reject) {
      let result = []

      const stream = sqlStream({
        database,
        user,
        password,
        statements: [statement],
        describe: false,
      })

      stream.on('finish', function onFinish() {
        resolve(result)
      })

      stream.on('messages', function onMessages(messages) {
        const fieldNames = Object.keys(fields)
        const rows = messages
          .filter(Array.isArray)
          .map(row => zipObject(fieldNames, row))

        result = result.concat(rows)
      })

    })
  }

  function zipObject(keys, values) {
    return keys.reduce((obj, key, i) => (obj[key] = values[i], obj), {})
  }

})
