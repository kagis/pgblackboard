import next_statement from './next_statement.js';

describe('next_statement', () => {
  it('should split statements.', () => {
    expect(next_statement(`SELECT 1; SELECT 2;`)).to.eql('SELECT 1;')
  });
  it('should ignore semicolon within extended literal.', () => {
    assert_no_split(`SELECT e'\\';\\'', ...`)
    assert_no_split(`SELECT E'\\';\\'', ...`)
  });
  it('should ignore semicolon within ident.', () => {
    assert_no_split(`SELECT 1 AS ";", ...`)
  });
  it('should ignore semicolon within dollar literal.', () => {
    assert_no_split(`SELECT 1 AS $$;$$, ...`)
  });
  it('should ignore semicolon within dollar literal with named tag.', () => {
    assert_no_split(`SELECT 1 AS $foo_1$\n;$foo_1$, ...`)
  });
  it('should ignore semicolon within dollar literal with nested dollar.', () => {
    assert_no_split(`SELECT 1 AS $foo_1$ $bar\n; $foo_1$`)
  });
  it('should ignore semicolon within block comment.', () => {
    assert_no_split(`SELECT 1/*\n;*/, ...`)
  });
  it('should ignore semicolon within line comment.', () => {
    assert_no_split(`SELECT 1 -- one;\n, ...`)
  });

  function assert_no_split(script) {
    expect(next_statement(script)).to.eql(script)
  }
});
