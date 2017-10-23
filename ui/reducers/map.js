export default (state = {
  show_sat: false,
}, action) => {
  switch (action.type) {
    case 'MAP_SAT_TOGGLE':
      return {
        ...state,
        show_sat: action.should_show_sat,
      };

    default:
      return state;
  }
};
