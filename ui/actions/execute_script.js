define(function (require, exports, module) {
  'use strict';
  
  const next_statement = require('../sql/next_statement');
  const extract_connect_metacmd = require('../sql/extract_connect_metacmd');
  const strip_comments_on_start = require('../sql/strip_comments_on_start');
  const linecol = require('../sql/linecol');
  const sql_stream = require('../api/sql_stream');

  module.exports = ({ use_map }) => (dispatch, state) => {
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

    const stream = sql_stream({
      statements: statements.map(it => it.code),
      database,
      user: state.credentials.user,
      password: state.credentials.password,
      describe: true,
    });
    
    let latest_stmt_idx = -1;

    stream.on('messages', function (messages) {
      while (messages.length) {
        if (Array.isArray(messages[0])) {
          const lastRowIndex = messages.findIndex(it => !Array.isArray(it));
          dispatch({
            type: 'STATEMENT_ROWS',
            rows: messages.splice(0, lastRowIndex < 0 ? messages.length : lastRowIndex),
          });
        } else {
          const m = messages.shift();
          switch (m.messageType) {
            case 'description':
              dispatch({
                type: 'STATEMENT_DESCRIBE',
                description: m.payload,
              });
              break;

            case 'executing':
              latest_stmt_idx++;
              dispatch({
                type: 'STATEMENT_EXECUTING',
              });
              break;

            case 'complete':
              dispatch({
                type: 'STATEMENT_COMPLETE',
                command_tag: m.payload,
              });
              break;

            case 'error':
              dispatch({
                type: 'STATEMENT_ERROR',
                message: m.payload.message,
                linecol: linecol(full_script.slice(0,
                  statements[latest_stmt_idx].position_offset +
                    m.payload.position)),
              });
              break;
          }
        }
      }
    });
    
    stream.on('error', e => dispatch({
      type: 'EXEC_ERROR',
      message: e && e.message || String(e),
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
  
})
