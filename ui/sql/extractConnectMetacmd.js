define(function (require, exports, module) {
  'use strict';
  
  module.exports = extractConnectMetacmd;
  
  function extractConnectMetacmd(input) {
    const m = input.match(/^((\s*\\connect[ \t]+)(("[^"]*")+|\w+)[ \t]*\n)([^]*)/);
    return m && {
      dbname: unquoteIdent(m[3]),
      dbnamePos: m[2].length,
      script: m[5],
      scriptPos: m[1].length,
    };
  }
  
  function unquoteIdent(quoted) {
    if (quoted[0] == '"' && quoted[quoted.length - 1] == '"') {
      return quoted.substring(1, quoted.length - 1).replace(/""/g, '"');
    }
    return quoted;
  }
  
})
