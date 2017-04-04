'use strict';

define(function (require, exports, module) {
  const dispatch = require('core/dispatch');
  const create_event_emitter = require('core/event_emitter');

  module.exports = createStore;

  class Store {
    constructor(reducer) {
      this._reducer = reducer;
      this._eventEmitter = create_event_emitter();
      this.state = reducer(undefined, {
        type: 'INIT',
      });

      dispatch.subscribe(this._handleAction.bind(this));
    }

    subscribe(listener) {
      this._eventEmitter.on('change', listener);
    }

    _handleAction(action) {
      if (typeof action == 'function') {
        action(dispatch, this.state);
      } else {
        this.state = this._reducer(this.state, action);
        this._eventEmitter.emit('change', {
          state: this.state,
          action,
        });
      }
    }
  }

  function createStore(reducer) {
    return new Store(reducer);
  }
});
