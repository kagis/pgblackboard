export default function reduce_stmt_results(state, action) {
  switch (action.type) {
    case 'INIT':
    // case 'TREENODE_SELECT_SUCCESS':
    // case 'DRAFTS_SELECT':
    case 'EXEC':
      return [];

    // case 'EXPAND_QUERY_PLAN':
    //   return merge(state, {
    //       [action.resultIndex]: {
    //         isFullPageView: true,
    //       },
    //   });

    // case 'COLLAPSE_QUERY_PLAN':
    //   return merge(state, {
    //       [action.resultIndex]: {
    //         isFullPageView: false,
    //       },
    //   });

    // case 'MOVE_QUERY_PLAN':
    //   return merge(state, {
    //       [action.resultIndex]: action.extent,
    //   });
    //   // return versioned.extend(state, ['items', action.resultIndex], action.extent);

    case 'STATEMENT_EXECUTING':
      return [...state, reduce_stmt_results_inner(state, action)];

    case 'STATEMENT_COMPLETE':
    case 'STATEMENT_ERROR':
    case 'STATEMENT_NOTICE':
    case 'STATEMENT_DESCRIBE':
    case 'STATEMENT_ROWS':
    case 'MAP_LAYER_TOGGLE':
      return Object.assign([], state, {
        [action.stmt_index]: reduce_stmt_results_inner(
          state[action.stmt_index],
          action
        ),
      });

    case 'TABLE_SAVE_SUCCESS': {
      const patches = state
        .map((it, i) => [
          it,
          i,
          it.src_table && action.edits[JSON.stringify([
            it.src_table.database,
            it.src_table.table_name,
          ])]
        ])
        .filter(([_, __, table_edits]) => table_edits)
        .map(([stmt_result, stmt_index, { inserts = [], updates = {}, deletes = {} }]) => {
          const { src_table, fields } = stmt_result;
          const key_fields_indexes = src_table.key_columns.map(
            key_column => fields.findIndex(
              ({ src_column }) => src_column == key_column
            )
          );
          const get_key = row => JSON.stringify(
            key_fields_indexes.map(i => [fields[i].src_column, row[i]])
          );
          const rows = stmt_result.rows
            .filter(row => !(get_key(row) in deletes))
            .map(row => {
              const row_update = updates[get_key(row)];
              if (!row_update) {
                return row;
              }
              return row.map((value, i) => [
                value,
                fields[i].src_column
              ]).map(([value, column]) => column in row_update
                ? row_update[column] : value
              );
            })
            .concat(inserts.map(dict => fields.map(
              field => dict[field.src_column]
            )));
          return { [stmt_index]: Object.assign({}, stmt_result, { rows }) };
        });
      return Object.assign([], state, ...patches);
    }

    default:
      return state;
  }
}

function reduce_stmt_results_inner(state, action) {
  switch (action.type) {
      case 'STATEMENT_EXECUTING':
      return {
        rows: [],
        notices: [],
        stmt: action.stmt,
      };

    case 'STATEMENT_COMPLETE':
      return Object.assign({}, state, {
        command_tag: action.command_tag,
        queryplan: action.command_tag == 'EXPLAIN'
          && state.fields.length == 1
          && state.fields[0].typ == 'json'
          && queryplan_json(JSON.parse(state.rows[0][0])[0]['Plan'])
      });

    case 'STATEMENT_ERROR':
      return Object.assign({}, state, {
        error: {
          message: action.message,
          linecol: action.linecol,
        },
      });

    case 'STATEMENT_NOTICE':
      return Object.assign({}, state, {
        notices: [...state.notices, action.notice],
      });

    case 'STATEMENT_DESCRIBE':
      return {
        ...state,
        ...action.description,
        show_layer: true,
        geom_field_idx: action.description
          && action.description.fields
          && action.description.fields.map(({ name }, idx) => ({ name, idx }))
            .filter(({ name }) => name == 'st_asgeojson')
            .map(({ idx }) => idx)[0]
      };

    case 'STATEMENT_ROWS':
      return Object.assign({}, state, {
        rows: [...state.rows, ...action.rows],
      });

    case 'MAP_LAYER_TOGGLE':
      return {
        ...state,
        show_layer: action.should_show_layer,
      };

    default:
      return state;
  }
}

function queryplan_json({ 'Plans': children_raw, ...jsonplan }) {
  const children = (children_raw || []).map(queryplan_json);
  const untotal = prop => children
    .map(child => child.props[prop])
    .filter(Boolean)
    .reduce((a, b) => a - b, jsonplan[prop]);

  return {
    props: jsonplan,
    duration: untotal('Actual Total Time') * jsonplan['Actual Loops'] || null,
    cost: untotal('Total Cost'),
    children,
  };
}

