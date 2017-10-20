export default function reduce_combined(state, action, reducers) {
  const next_state = {};
  if (action.type == 'INIT') {
    state = {};
  }

  let has_changes = false;
  for (let key of Object.getOwnPropertyNames(reducers)) {
    const child_state = state[key];
    const next_child_state = reducers[key](child_state, action);
    next_state[key] = next_child_state;
    has_changes = has_changes || (next_child_state !== child_state);
  }
  return has_changes ? next_state : state;
}
