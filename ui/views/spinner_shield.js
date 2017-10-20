import el from '../core/el.js';

export default ({ is_visible }) => el('div.spinner_shield'
  ,is_visible && el.class('spinner_shield--visible')
);
