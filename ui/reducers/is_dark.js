export default (is_dark, action) => {
  switch (action.type) {
    case 'INIT':
      return false;
    case 'THEME_TOGGLE':
      return !is_dark;
    default:
      return is_dark;
  }
};
