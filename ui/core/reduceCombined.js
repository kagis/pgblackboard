'use strict';

define(function (require, exports, module) {
  module.exports = reduceCombined;

  function reduceCombined(state, action, reducers) {
    const nextState = {};
    if (action.type == 'INIT') {
      state = {};
    }

    let hasChanges = false;
    for (let key of Object.getOwnPropertyNames(reducers)) {
      const childState = state[key];
      const nextChildState = reducers[key](childState, action);
      nextState[key] = nextChildState;
      hasChanges = hasChanges || (nextChildState !== childState);
    }
    return hasChanges ? nextState : state;
  }
});
