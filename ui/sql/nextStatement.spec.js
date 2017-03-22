define(function (require) {
  'use strcit'
  const nextStatement = require('./nextStatement.js')
  
  describe('nextStatement', function () {
    it('should split statements.', function () {
      expect(nextStatement(`SELECT 1; SELECT 2;`)).to.eql('SELECT 1;')
    })
    it('should ignore semicolon within extended literal.', function () {
      assertNoSplit(`SELECT e'\\';\\'', ...`)
      assertNoSplit(`SELECT E'\\';\\'', ...`)
    })
    it('should ignore semicolon within ident.', function () {
      assertNoSplit(`SELECT 1 AS ";", ...`)
    })
    it('should ignore semicolon within dollar literal.', function () {
      assertNoSplit(`SELECT 1 AS $$;$$, ...`)
    })
    it('should ignore semicolon within dollar literal with named tag.', function () {
      assertNoSplit(`SELECT 1 AS $foo_1$\n;$foo_1$, ...`)
    })
    it('should ignore semicolon within dollar literal with nested dollar.', function () {
      assertNoSplit(`SELECT 1 AS $foo_1$ $bar\n; $foo_1$`)
    })
    it('should ignore semicolon within block comment.', function () {
      assertNoSplit(`SELECT 1/*\n;*/, ...`)
    })
    it('should ignore semicolon within line comment.', function () {
      assertNoSplit(`SELECT 1 -- one;\n, ...`)
    })
  
    function assertNoSplit(script) {
      expect(nextStatement(script)).to.eql(script)
    }
  })
})
