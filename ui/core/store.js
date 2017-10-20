import dispatch from './dispatch.js';
import create_event_emitter from './event_emitter.js';

export default createStore;

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
