export default input => {
  let tail = input
  while (tail && tail[0] != ';') {
    tail = tail.slice([
        /^"[^"]*"/, // ident
        /^'[^']*'/, // literal
        /^[eE]'(\\.|[^'])*'/, // extended literal
        /^--.*/, // line comment
        /^\/\*[^]*?\*\//, // block comment
        /^(\$\w*\$)[^]*?\1/, // dollar quoted literal
      ].map(re => tail.match(re))
        .filter(Boolean)
        .map(m => m[0].length)[0] || 1
    );
  }
  return input.substr(0, input.length - tail.length + 1);
};
