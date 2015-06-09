// turn a space-separated list into an array
function set(words) {
    var obj = {};
    for (var i = 0; i < words.length; ++i) {
        obj[words[i]] = true;
    }
    return obj;
}

module.exports = {
    'name': 'sql',
    'keywords': set(require('./pg-keywords')),
    'builtin': set(require('./pg-builtins')),
    'atoms': set(['false', 'true', 'null']),
    'operatorChars': /^[*+\-%<>!=]/,
    'dateSQL': set(['date', 'time', 'timestamp', 'timestamptz', 'interval']),
    'support': set(['doubleQuote', 'binaryNumber', 'hexNumber'])
};
