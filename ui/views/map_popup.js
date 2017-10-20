import el from '../core/el.js';

export default render_map_popup;

function render_map_popup(props) {
  return el('table.map_popup'
    ,props.map(({ name, value }) => (
      el('tr'
        ,el('td.map_popup-prop_name', name)
        ,el('td.map_popup-prop_value', value)
      ))
    )
  );
}

