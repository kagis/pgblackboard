define(function (require) {
  'use strict';
  
  const reduce_stmt_results = require('./stmt_results');
  
  describe('reduce_stmt_results TABLE_SAVE', function () {
    it('update', function () {
      expect(reduce_stmt_results(
        [{
          rows: [['1', 'hello'], ['2', 'world']],
          fields: [{ src_column: 'id' }, { src_column: 'body' }],
          src_table: { table_name: 'public.items', key_columns: ['id'] },
        }], {
          type: 'TABLE_SAVED',
          // updates: {
          //   '["postgres","public.items",["id","1"]]': {
          //     body: 'bye',
          //   },
          // },
          edits: {
            'public.items': {
              updates: {
                '[["id","1"]]': { body: 'bye' }, 
              },
            },
          },
        }
      ).map(it => it.rows)).to.eql([
        [['1', 'bye'], ['2', 'world']],
      ]);
    });
    
    it('delete', function () {
      expect(reduce_stmt_results(
        [{
          rows: [['1', 'hello'], ['2', 'world']],
          fields: [{ src_column: 'id' }, { src_column: 'body' }],
          src_table: { table_name: 'public.items', key_columns: ['id'] },
        }], {
          type: 'TABLE_SAVED',
          edits: {
            'public.items': {
              deletes: {
                '[["id","1"]]': true, 
              },
            },
          },
        }
      ).map(it => it.rows)).to.eql([
        [['2', 'world']],
      ]);
    });
    
    it('insert', function () {
      expect(reduce_stmt_results(
        [{
          rows: [['1', 'hello'], ['2', 'world']],
          fields: [{ src_column: 'id' }, { src_column: 'body' }],
          src_table: { table_name: 'public.items', key_columns: ['id'] },
        }], {
          type: 'TABLE_SAVED',
          edits: {
            'public.items': {
              inserts: [
                { id: '3', body: 'three' }
              ],
            },
          },
        }
      ).map(it => it.rows)).to.eql([
        [['1', 'hello'], ['2', 'world'], ['3', 'three']],
      ]);
    });
  });
});