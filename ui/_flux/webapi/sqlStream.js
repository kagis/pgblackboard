define(function (require, exports, module) {
  'use strict';

  const createEventEmitter = require('core/eventEmitter')

  module.exports = sqlStream

  function sqlStream({
    script,
    user,
    password,
    describe,
  }) {

    let offset = 0;
    const ee = createEventEmitter()
    const xhr = new XMLHttpRequest()
    xhr.addEventListener('load', onComplete)
    xhr.addEventListener('readystatechange', onReadyStateChange)
    xhr.open('POST', '/exec_')
    xhr.send(JSON.stringify({
      script,
      user,
      password,
      describe,
    }))
    return ee

    function onReadyStateChange(e) {
      const chunkEndIndex = xhr.responseText.lastIndexOf('\r\n')
      if (chunkEndIndex > offset) {
        const chunk = xhr.responseText.substring(offset, chunkEndIndex)
        const validJsonChunk = wrapChunk(chunk)
        const parsedChunk = JSON.parse(validJsonChunk)
        ee.emit('messages', parsedChunk)
        offset = chunkEndIndex + 2
      }
    }

    function onComplete() {
      ee.emit('finish')
    }
  }

  function wrapChunk(chunk) {
    if (chunk[0] == ',') {
      return '[' + chunk.slice(1) + ']'
    }
    return chunk + ']'
  }
})
