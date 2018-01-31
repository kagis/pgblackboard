import el from '../../core/el.js';
import dispatch from '../../core/dispatch.js';

export default ({ stmt_results, map: { show_sat } }) => (
    el('div.layers'
    ,el('label.layers-item'
        ,el('input'
          ,el.attr('type', 'checkbox')
          ,show_sat && el.attr('checked', 'checked')
          ,el.on('change', e => dispatch({
            type: 'MAP_SAT_TOGGLE',
            should_show_sat: e.target.checked,
          }))
        )
        ,'__satellite__'
      )
      ,stmt_results
        .map((it, stmt_index) => ({ ...it, stmt_index }))
        .filter(({ geom_field_idx }) => typeof geom_field_idx == 'number')
        .map(({ show_layer, src_table, stmt, stmt_index }) =>
          el('label.layers-item'
            ,el('input'
              ,el.attr('type', 'checkbox')
              ,show_layer && el.attr('checked', 'checked')
              ,el.on('change', e => dispatch({
                type: 'MAP_LAYER_TOGGLE',
                stmt_index,
                should_show_layer: e.target.checked,
              }))
            )
            ,src_table && src_table.table_name || stmt.slice(0, 20)
          )
        )
    )
  );

