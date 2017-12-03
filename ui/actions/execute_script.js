import next_statement from '../sql/next_statement.js';
import extract_connect_metacmd from '../sql/extract_connect_metacmd.js';
import strip_comments_on_start from '../sql/strip_comments_on_start.js';
import linecol from '../sql/linecol.js';
import sql_stream from '../api/sql_stream.js';
import sql_query from '../api/sql_query.js';
import bus from '../core/bus.js';

let current_stream;

export const execute_script = ({ use_map }) => (dispatch, state) => {
  dispatch({
    type: 'EXEC',
    use_map: Boolean(use_map),
  });

  const full_script = getScript();
  const database_and_script = extract_connect_metacmd(full_script);
  if (!database_and_script) {
    return dispatch({
      type: 'EXEC_ERROR',
      message: '\\connect missed on first line',
    });
  }
  const database = database_and_script.database;
  let tail = database_and_script.script;
  const statements = [];
  while (tail) {
    const code = next_statement(tail);
    const position_offset = statements.slice(-1)
      .map(it => it.position_offset + it.code.length)[0] ||
      database_and_script.script_pos;
    tail = tail.slice(code.length);
    statements.push({ code, position_offset });
  }

  const stream = current_stream = sql_stream({
    statements: statements.map(it => it.code),
    database,
    user: state.credentials.user,
    password: state.credentials.password,
    describe: true,
    rowlimit: 1000,
  });

  let stmt_index = -1;

  stream.on('messages', function (messages) {
    while (messages.length) {
      if (Array.isArray(messages[0])) {
        const lastRowIndex = messages.findIndex(it => !Array.isArray(it));
        dispatch({
          type: 'STATEMENT_ROWS',
          stmt_index,
          rows: messages.splice(0, lastRowIndex < 0 ? messages.length : lastRowIndex),
        });
      } else {
        const m = messages.shift();
        switch (m.messageType) {
          case 'backendkey':
            dispatch({
              type: 'BACKENDKEY',
              ...m.payload,
            });
            break;

          case 'description':
            dispatch({
              type: 'STATEMENT_DESCRIBE',
              stmt_index,
              description: m.payload,
            });
            break;

          case 'executing':
            stmt_index++;
            dispatch({
              type: 'STATEMENT_EXECUTING',
              stmt_index,
              stmt: statements[stmt_index].code,
            });
            break;

          case 'complete':
            dispatch({
              type: 'STATEMENT_COMPLETE',
              stmt_index,
              command_tag: m.payload,
            });
            break;

          case 'error':
            dispatch({
              type: 'STATEMENT_ERROR',
              stmt_index,
              message: m.payload.message,
              linecol: linecol(full_script.slice(0,
                statements[stmt_index].position_offset +
                  (m.payload.position || stmt_start_pos(statements[stmt_index].code)))),
            });
            break;
        }
      }
    }
  });

  function stmt_start_pos(stmt) {
    return stmt.length - strip_comments_on_start(stmt).length;
  }

  stream.on('error', e => dispatch({
    type: 'EXEC_ERROR',
    message: e && e.message || String(e),
  }));

  stream.on('finish', () => dispatch({
    type: 'EXEC_COMPLETE',
  }));

  function getScript() {
    const selected_document = state.selected_document;
    const drafts = state.drafts;
    return drafts[selected_document.draft_id] ?
      drafts[selected_document.draft_id].content :
      selected_document.content;
  }

  function getScriptSelection() {
    return state.selected_document.selection;
  }
};

export const cancel_script = () => function cancel(dispatch, state) {
  sql_query({
    statements: [`select pg_cancel_backend(${state.backendkey.process_id})`],
    database: 'postgres',
    credentials: state.credentials,
  });
  // if (current_stream) {
  //   current_stream.abort();
  //   current_stream = null;
  // }
  // return {
  //   type: 'EXEC_CANCEL',
  // };
};
