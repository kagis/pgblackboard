define(function (require) {
  'use strict';
  
  const extractConnectMetacmd = require('./extractConnectMetacmd.js');
  
  describe('extractConnectMetacmd', function () {
    it('should extract database name', function () {
      expect(extractConnectMetacmd('\\connect postgres\nselect 1')).to.eql({
        dbname: 'postgres',
        dbnamePos: 9,
        script: 'select 1',
        scriptPos: 18,
      });
    });
    it('should extract quoted database name', function () {
      expect(extractConnectMetacmd('\\connect "special ""db"" name"\nselect 1')).to.eql({
        dbname: 'special "db" name',
        dbnamePos: 9,
        script: 'select 1',
        scriptPos: 31,
      });
    });
  });
});