'use strict';

define(function (require, exports, module) {
  class MyQueriesRepo {
    constructor(storage) {
      /** @private */
      this.storage = storage;

      /** @private */
      this.keyPrefix = 'pgblackboard_query_';
    }

    getAll() {
      var items = {};
      for (var i = 0; i < this.storage.length; i++) {
        var key = this.storage.key(i);
        if (key.lastIndexOf(this.keyPrefix, 0) === 0) {
          items[key] = {
            id: key,
            content: this.storage.getItem(key)
          };
        }
      }
      return items;
    }

    create(content) {
      var newid = this.keyPrefix + Date.now();
      var newMyQuery = {
        id: newid,
        content: content
      };
      this.storage.setItem(newid, content);
      return newMyQuery;
    }

    update(id, content) {
      this.storage.setItem(id, content);
    }

    remove(id) {
      this.storage.removeItem(id);
    }
  }

  module.exports = new MyQueriesRepo(window.localStorage);
});
