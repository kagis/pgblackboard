import { editor, Uri } from './_lib/monaco.js';

export class Store {

  light_theme = false;
  panes = { left: .2, right: .6, out: .8, map: 0 };
  tree = {};
  curr_treenode_path = null;
  login_pending = false;
  login_done = false;
  login_error = '';
  // TODO track run_count for drafts, gc least used
  drafts_kv = {};
  stored_draft_ids = [];
  dirty_draft_ids = null;
  curr_draft_id = null;
  datum_focused = false;
  out = {
    frames: [{
      curr_col_idx: -1,
      geom_col_idx: -1,
      cols: [],
      // status: 'SELECT 1',
      rows: [{
        edit: 'update',
        tuple: [],
        updates: [],
      }],
      deletes: {},
      updates: {
        // "('admterr', 'kz')": {
        //   'doc': '{ "name": "hello" }'
        // },
      },
      inserts: [],
    }].slice(0, 0),
    messages: [],
    curr_frame_idx: null,
    curr_row_idx: null,
    // draft_ver: null,
    error_pos: null,
    loading: false,
    aborter: null,


    db: null,
    took_msec: 0,
    // updates: {
    //   '["table","()"]': {
    //     'col1': 1,
    //     'col2': 'a'
    //   },
    // },
    // inserts: [],
  };

  resize_panes(update) {
    Object.assign(this.panes, update);
  }

  sync_datum_focused(value) {
    this.datum_focused = value;
  }

  async login(u, password) {
    // TODO cancel previous pending req
    this.login_pending = true;
    this.login_error = '';
    try {
      // await new Promise(resolve => setTimeout(resolve, 3000));
      const { ok, reason, key } = await this._api('login', { u }, { password });
      if (!ok) return this.login_error = reason;
      this._key = key;
      this._user = u;
      // this.drafts = this._load_drafts();
      await this.tree_toggle([]);

      const initial_draft_id = this._add_draft(
        `\\connect postgres\n\n` +
        `SELECT * FROM pg_stat_activity;\n`,
      );
      this._unset_curr_draft();
      this.curr_draft_id = initial_draft_id;

      this._load_drafts();
      setInterval(_ => this._flush_drafts(), 10e3);
      window.addEventListener('unload', _ => this._flush_drafts());

      this.login_done = true;
    } catch (err) {
      this.login_error = String(err);
    } finally {
      this.login_pending = false;
    }
  }

  _load_drafts() {
    const storage = localStorage;
    // TODO validate array
    this.stored_draft_ids = JSON.parse(storage.getItem('pgbb:draft:_ids')) || [];;
    for (const id of this.stored_draft_ids) {
      this._add_draft(storage.getItem(id), id);
    }
  }

  _flush_drafts() {
    // TODO gc drafts
    if (!this.dirty_draft_ids) return;
    localStorage.setItem('pgbb:draft:_ids', JSON.stringify(this.stored_draft_ids));
    for (const id in this.dirty_draft_ids) {
      if (this.stored_draft_ids.includes(id)) {
        // TODO handle QuotaExceededError
        localStorage.setItem(id, editor.getModel(id).getValue());
      } else {
        localStorage.removeItem(id);
      }
    }
    this.dirty_draft_ids = null;
  }

  _add_draft(content, draft_id) {
    draft_id ||= 'x://pgbb/draft_' + Date.now().toString(16).padStart(16, '0');
    const editor_model = editor.createModel(content, 'sql', Uri.parse(draft_id));
    this.drafts_kv[draft_id] = {
      id: draft_id,
      loading: false,
      caption: '',
      cursor_pos: 0,
      cursor_len: 0,
    };
    const draft =  this.drafts_kv[draft_id];
    editor_model.onDidChangeContent(update_caption);
    update_caption();
    return draft_id;

    function update_caption() {
      const pos = editor_model.getPositionAt(100);
      draft.caption = editor_model.getValueInRange({
        startLineNumber: 0,
        startColumn: 0,
        endLineNumber: pos.lineNumber,
        endColumn: pos.column,
      });
    }
  }

  async tree_toggle(path) {
    const node = path.reduce(({ children }, idx) => children.value[idx], this.tree);
    if (node.children) {
      // collapse if expanded
      node.children = null;
      return;
    }
    node.children = { value: null, loading: true };
    const { db, children, id } = node;
    try {
      const { result } = await this._api('tree', { u: this._user, db, node: id, key: this._key });
      // TODO what if no children?
      children.value = result;
    } finally {
      children.loading = false;
    }
  }

  // TODO set_curr_treenode
  async tree_select(path) {
    const draft_id = this._add_draft('-- loading --');
    const draft = this.drafts_kv[draft_id];
    draft.loading = true;
    const editor_model = editor.getModel(draft_id);
    this._unset_curr_draft();
    this.curr_draft_id = draft_id;
    this.curr_treenode_path = path;
    const node = path.reduce(({ children }, idx) => children.value[idx], this.tree);
    const { db, id } = node;
    const content = await (
      this._api('defn', { u: this._user, db, node: id, key: this._key })
      .then(({ result }) => result || '', err => `/* ${err} */\n`)
      // TODO indicate dead treenode when treenode not found
    );
    if (!editor_model.isDisposed()) {
      editor_model.setValue(content);
    }
    draft.loading = false;
  }

  async _api(api, qs, body) {
    qs = JSON.parse(JSON.stringify(qs)); // rm undefined
    const resp = await fetch('?' + new URLSearchParams({ api, ...qs }), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!resp.ok) throw Error(`${resp.status} error`);
    return resp.json();
  }

  get curr_draft() {
    return this.drafts_kv[this.curr_draft_id];
  }

  set_code_cursor(cursor_pos, cursor_len) {
    Object.assign(this.curr_draft, { cursor_pos, cursor_len });
  }

  _unset_curr_draft() {
    if (
      this.curr_draft_id in this.drafts_kv &&
      !this.stored_draft_ids.includes(this.curr_draft_id)
    ) {
      delete this.drafts_kv[this.curr_draft_id];
      editor.getModel(this.curr_draft_id).dispose();
    }
    this.curr_draft_id = null;
  }
  set_curr_draft(draft_id) {
    this._unset_curr_draft(draft_id);
    this.curr_draft_id = draft_id;
    this.curr_treenode_path = null;
  }

  rm_draft(draft_id) {
    const idx = this.stored_draft_ids.indexOf(draft_id);
    this.stored_draft_ids.splice(idx, 1);
    delete this.drafts_kv[draft_id];
    editor.getModel(draft_id).dispose();
    this.dirty_draft_ids ||= {};
    this.dirty_draft_ids[draft_id] = true;
    if (draft_id == this.curr_draft_id) {
      // TODO
      this.curr_draft_id = null;
    }
  }

  save_curr_draft() {
    this.dirty_draft_ids ||= {};
    this.dirty_draft_ids[this.curr_draft_id] = true;
    if (!this.stored_draft_ids.includes(this.curr_draft_id)) {
      this.stored_draft_ids.unshift(this.curr_draft_id);
      this.curr_treenode_path = null;
    }
    // TODO schedule write to localStorage
  }

  resize_col(frame_idx, col_idx, width) {
    this.out.frames[frame_idx].cols[col_idx].width = width;
  }

  // TODO set_curr_row
  set_curr_rowcol(frame_idx, row_idx, col_idx) {
    this.out.curr_frame_idx = frame_idx;
    this.out.curr_row_idx = row_idx;
    if (col_idx != null) {
      this.out.frames[frame_idx].curr_col_idx = col_idx;
    }
  }

  get curr_datum() {
    const frame = this.out.frames[this.out.curr_frame_idx];
    if (!frame) return;
    // const col = out.cols?.[out.curr_col_idx];
    return frame.rows[this.out.curr_row_idx].tuple[frame.curr_col_idx];
  }

  delete_row(frame_idx, row_idx) {
    const row = this.out.frames[frame_idx].rows[row_idx];
    // row.will_delete = !row.will_delete;
    row.dirty = row.dirty == 'delete' ? null : 'delete';
    // TODO how to revert row changes? double delete?
  }

  revert_row(frame_idx, row_idx) {
    const row = this.out.frames[frame_idx].rows[row_idx];
    row.dirty = null;
    row.updates = [];
  }

  edit_datum(frame_idx, row_idx, col_idx, new_value) {
    const row = this.out.frames[frame_idx].rows[row_idx];
    row.dirty = 'update';
    row.updates[col_idx] = new_value;
  }

  get_changes_num() {
    let count = 0;
    for (const { rows } of this.out.frames) {
      for (const { dirty } of rows) {
        if (dirty) {
          count++;
        }
      }
    }
    return count;
  }

  dump_changes() {
    let script = `\\connect ${this.out.db}\n\nBEGIN READ WRITE;\n\n`;

    for (const frame of this.out.frames) {
      const key_idxs = frame.cols.map((col, i) => col.att_key && i).filter(Number.isInteger);
      const key_names = tuple_expr(key_idxs.map(i => frame.cols[i].att_name));

      const delete_keys = [];
      const update_keys = [];
      const update_stmts = [];
      for (const { dirty, tuple, updates } of frame.rows) {
        const key_vals = tuple_expr(key_idxs.map(i => literal(tuple[i])));

        switch (dirty) {
          case 'delete':
            delete_keys.push(key_vals);
            break;
          case 'update': {
            const set_entries = [];
            for (const [col_idx, col] of frame.cols.entries()) {
              const upd_value = updates[col_idx];
              if (upd_value === undefined) continue;
              set_entries.push(`${col.att_name} = ${literal(upd_value)}`);
            }
            update_stmts.push(
              `UPDATE ${frame.rel_name}\n` +
              `SET ${set_entries.join('\n  , ')}\n` +
              `WHERE ${key_names} = ${key_vals};\n\n`
            );
            update_keys.push(key_vals);
            break;
          };
        }
      }

      if (delete_keys.length) {
        script += (
          `DELETE FROM ${frame.rel_name}\n` +
          `WHERE ${key_names} IN (\n  ${delete_keys.join(',\n  ')}\n);\n\n`
        );
      }
      if (update_stmts.length) {
        script += update_stmts.join('');
        script +=  (
          `SELECT * FROM ${frame.rel_name}\n` +
          `WHERE ${key_names} IN (\n  ${update_keys.join(',\n  ')}\n);\n\n`
        );
      }
    }

    const draft_id = this._add_draft(script);
    this._unset_curr_draft();
    this.curr_draft_id = draft_id;
    this.curr_treenode_path = null;

    // TODO clear edits

    function literal(s) {
      return s == null ? 'NULL' : `'${s.replace(/'/g, `''`)}'`;
    }
    function tuple_expr(arr) {
      const joined = arr.join(', ');
      return arr.length > 1 ? `(${joined})` : joined;
    }
  }

  toggle_theme() {
    this.light_theme = !this.light_theme;
  }

  can_abort() {
    return this.out.loading;
  }

  abort() {
    this.out.aborter.abort();
  }

  can_run() {
    return !this.out.loading && !this.curr_draft?.loading;
  }

  async run({ rw }) {
    const draft = this.curr_draft;
    const { cursor_pos, cursor_len } = draft;
    const editor_model = editor.getModel(this.curr_draft_id);
    let sql = editor_model.getValue()

    const m = /^\s*\\connect\s+(\w+|("[^"]*")+)/.exec(sql);
    const [, db] = m;
    const cl = m[0].length;
    // TODO database name can contain non ascii (more wide)
    sql = ' '.repeat(cl) + sql.slice(cl);

    if (cursor_len) {
      const [from, to] = [cursor_pos, cursor_pos + cursor_len].sort((a, b) => a - b);
      sql = '\n'.padStart(from, ' ') + sql.slice(from, to);
    }

    const aborter = new AbortController();
    this.out = {
      db,
      frames: [],
      messages: [],
      curr_frame_idx: null,
      curr_row_idx: null,
      error_pos: null,
      loading: true,
      aborter,
      took_msec: 0,
    };
    const out = this.out;

    try {
      const qs = new URLSearchParams({ api: 'exec', u: this._user, db, key: this._key });
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const body = JSON.stringify({ sql, tz, rw });
      const resp = await fetch('?' + qs, { method: 'POST', body, signal: aborter.signal });
      if (!resp.ok) throw Error('HTTP Error', { cause: await resp.text() });
      const msg_stream = (
        resp.body
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(new JSONDecodeStream())
      );
      let frame = null;
      for await (const msg of iter_stream(msg_stream)) {
        const { tag, payload, rows } = msg;
        switch (tag) {
          case 'RowDescription':
            out.frames.push({
              cols: payload.map(col => ({ ...col, width: 150 })),
              curr_col_idx: Boolean(payload.length) - 1,
              geom_col_idx: payload.findIndex(col => /^st_asgeojson$/i.test(col.name)),
              rows: [],
            });
            frame = out.frames.at(-1);
            break;
          // TODO CopyData
          case 'DataRow':
            // TODO set selected frame_idx/row_idx/col_idx
            frame.rows.push(...rows.map(tuple => ({ tuple, updates: [], dirty: null })));
            break;
          case 'NoticeResponse':
          case 'ErrorResponse':
            out.error_pos = payload.position && payload.position - 1;
            // out.messages.push(payload);
            out.messages.push(msg)
            break;
          case 'EmptyQueryResponse':
          case 'PortalSuspended':
            // out.messages.push({ message: tag });
            out.messages.push(msg);
            break;
          case 'CommandComplete':
            out.messages.push(msg);
            break;
          case 'duration':
            out.took_msec = msg.payload;
            break;
          case 'epilog':
            for (const [frame_idx, { cols, rel_name }] of payload.entries()) {
              const frame = out.frames[frame_idx];
              Object.assign(frame, { rel_name });
              for (const [col_idx, col] of cols.entries()) {
                Object.assign(frame.cols[col_idx], col);
              }
            }
            break;
          // TODO EmptyQuery, PortalSuspended
        }
      }
    } catch (err) {
      // out.messages.push({ message: err });
      out.messages.push({
        tag: 'ErrorResponse',
        payload: {
          severity: 'ERROR',
          code: null,
          message: String(err),
        },
      })
    } finally {
      out.aborter = null;
      out.loading = false;
    }
  }

  // TODO show COMMIT/ROLLBACK button if connection is left in transaction
}

class JSONDecodeStream extends TransformStream {
  constructor() {
    super({
      _incomplete: '',
      async transform(chunk, ctl) {
        chunk = this._incomplete + chunk;
        for (;;) {
          const eol_idx = chunk.indexOf('\n');
          if (eol_idx < 0) break;
          const line = chunk.slice(0, eol_idx + 1);
          chunk = chunk.slice(eol_idx + 1);
          ctl.enqueue(JSON.parse(line));
        }
        this._incomplete = chunk;
      },
    });
  }
}

// chrome 118 polyfill
async function * iter_stream(stream) {
  const reader = stream.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return;
      yield value;
    }
  } finally {
    reader.releaseLock();
  }
}
