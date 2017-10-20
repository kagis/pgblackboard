import create_event_emitter from './event_emitter.js';

export default dispatch;

const event_emitter = create_event_emitter();

function dispatch(action) {
  event_emitter.emit('action', action);
}

dispatch.subscribe = function (listener) {
  event_emitter.on('action', listener);
};
