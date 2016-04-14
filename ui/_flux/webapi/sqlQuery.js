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
        script: '\\connect ' + database + '\n' + statement,
        describe: false,
        user,
        password, 
      })

      stream.on('finish', function onFinish() {
        resolve(result)
      })

      stream.on('messages', function onMessages(messages) {
        const rows = messages
          .filter(Array.isArray)
          .map(row => zipObject(fields, row))

        result = result.concat(rows)
      })

    })
  }

  function zipObject(keys, values) {
    return keys.reduce((obj, key, i) => (obj[key] = values[i], obj), {})
  }

})
