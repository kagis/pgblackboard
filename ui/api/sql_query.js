define(function (require, exports, module) {
  'use strict';

  module.exports = ({
    statements,
    credentials: { user, password },
    database,
    describe = false
  }) => new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/exec');
    xhr.send(JSON.stringify({
      database,
      statements,
      user,
      password,
      describe,
    }));
    
    xhr.addEventListener('load', () => {
      let json_response;
      try {
        json_response = JSON.parse(xhr.responseText);
      }
      catch (e) {
        return reject({
          message: 'Invalid json response',
          body: xhr.responseText,
        });
      }
      if (xhr.status != 200) {
        return reject({ message: json_response });
      }
      const messages = json_response.slice(1);
      const success_result = [];
      let last_stmt_result;
      for (let msg of messages) {
        if (Array.isArray(msg)) {
          last_stmt_result.rows.push(msg);
          continue;
        }
        switch(msg.messageType) {
          case 'executing':
            success_result.push(last_stmt_result = {
              rows: [],
            });
            continue;
          case 'description':
            Object.assign(last_stmt_result, msg.payload);
            continue;
          case 'error':
            return reject(Object.assign(
              { stmt_index: success_result.length - 1 },
              msg.payload
            ));
        }
      }
      resolve(success_result);
    });
  });
  
});
