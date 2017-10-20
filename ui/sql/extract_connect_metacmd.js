export default input => {
  const m = input.match(/^((\s*\\connect[ \t]+)(("[^"]*")+|\w+)[ \t]*\r?\n)([^]*)/);
  return m && {
    database: unquoteIdent(m[3]),
    database_pos: m[2].length,
    script: m[5],
    script_pos: m[1].length,
  };
};

function unquoteIdent(quoted) {
  if (quoted[0] == '"' && quoted[quoted.length - 1] == '"') {
    return quoted.substring(1, quoted.length - 1).replace(/""/g, '"');
  }
  return quoted;
}

