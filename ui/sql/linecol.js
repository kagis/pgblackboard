export default str => ({
  line: (str.match(/\r?\n/g) || []).length,
  col: str.length - str.lastIndexOf('\n'),
});
