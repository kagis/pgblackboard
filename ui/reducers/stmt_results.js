define(function (require, exports, module) {
  'use strict';
  
  module.exports = reduce_stmt_results;
  
  function reduce_stmt_results(state, action) {
    switch (action.type) {
      case 'INIT':
      case 'TREENODE_DEFINITION_LOADED':
      case 'DRAFTS_SELECT':
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
        return Object.assign([], state, {
          [state.length - 1]: reduce_stmt_results_inner(
            state[state.length - 1],
            action
          ),
        });
        
      case 'TABLE_SAVED': {
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
        return Object.assign({}, state, action.description);

      case 'STATEMENT_ROWS':
        return Object.assign({}, state, { 
          rows: [...state.rows, ...action.rows],
        });
        
      default:
        return state;
    }
  }

  function queryplan_json(jsonplan) {
    const children = (jsonplan['Plans'] || []).map(queryplan_json);
    const untotal = prop => jsonplan[prop]
      - children.map(child => child.props[prop])
                .reduce((a, b) => a + b, 0);
    return {
      props: Object.assign({}, jsonplan, { 'Plans': null }),
      duration: untotal('Actual Total Time') * jsonplan['Actual Loops'],
      cost: untotal('Total Cost'),
      children,
    };
  }
  
});
