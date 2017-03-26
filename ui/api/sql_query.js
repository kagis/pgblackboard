define(function (require, exports, module) {
  'use strict';

  module.exports =  ({ statements, user, password, database }) => new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/exec');
    xhr.send(JSON.stringify({
      database,
      statements,
      user,
      password,
      describe: false,
    }));
    
    xhr.addEventListener('load', () => {
      const json_response = JSON.parse(xhr.responseText);
      if (xhr.status != 200) {
        return reject(json_response);
      }
      const messages = json_response.slice(1);
      const error = messages.filter(({ messageType }) => messageType == 'error')
        .map(({ payload }) => payload)[0];
      if (error) {
        return reject(error);
      }
      resolve(messages.reduce((acc, msg) => {
        if (Array.isArray(msg)) {
          const [latest] = acc.slice(-1);
          latest.rows.push(msg);
        } else if (msg.messageType == 'executing') {
          acc.push({ rows: [] });
        };
        return acc;
      }, []));
    });
  });
  
});
