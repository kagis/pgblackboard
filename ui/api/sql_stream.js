define(function (require, exports, module) {
  'use strict';
  const create_event_emitter = require('../core/event_emitter')

  module.exports = sql_stream

  function sql_stream(options) {
    let offset = 0;
    const ee = create_event_emitter();
    const xhr = new XMLHttpRequest();
    xhr.addEventListener('load', onload);
    xhr.addEventListener('error', onerror);
    xhr.addEventListener('loadend', onloadend);
    xhr.addEventListener('readystatechange', onreadystatechange);
    xhr.open('POST', 'exec');
    xhr.send(JSON.stringify(options));
    return Object.assign(ee, {
      abort: xhr.abort.bind(xhr),
    });

    function onreadystatechange(e) {
      if (xhr.status != 200) {
        return;
      }
      const chunk_end_index = xhr.responseText.lastIndexOf('\r\n');
      if (chunk_end_index > offset) {
        const chunk = xhr.responseText.slice(offset, chunk_end_index);
        const valid_json_chunk
          = chunk[0] == ','
            ? '[' + chunk.slice(1) + ']'
            : chunk + ']';
        const parsed_chunk = JSON.parse(valid_json_chunk);
        ee.emit('messages', parsed_chunk);
        offset = chunk_end_index + 2;
      }
    }

    function onload() {
      if (xhr.status != 200) {
        let resp = xhr.responseText;
        try {
          resp = JSON.parse(resp);
        } catch (e) {}
        ee.emit('error', resp);
      }
    }

    function onloadend() {
      ee.emit('finish');
    }

    function onerror(e) {
      ee.emit('error', e);
    }
  }
});
