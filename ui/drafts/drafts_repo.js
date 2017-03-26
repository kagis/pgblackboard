define(function (require, exports, module) {
  'use strict'
  
  class DraftsRepo {
    constructor(storage) {
      this._storage = storage;
      this._keyPrefix = 'pgblackboard_draft_'
    }

    get_all() {
      const items = {}
      for (let i = 0; i < this._storage.length; i++) {
        const key = this._storage.key(i)
        if (key.lastIndexOf(this._keyPrefix, 0) === 0) {
          items[key] = {
            id: key,
            content: this._storage.getItem(key)
          }
        }
      }
      return items
    }

    create(content) {
      const newid = this._keyPrefix + Date.now()
      const newMyQuery = {
        id: newid,
        content: content
      }
      this._storage.setItem(newid, content)
      return newMyQuery
    }

    update(id, content) {
      this._storage.setItem(id, content)
    }

    remove(id) {
      this._storage.removeItem(id)
    }
  }

  module.exports = new DraftsRepo(window.localStorage)
})
