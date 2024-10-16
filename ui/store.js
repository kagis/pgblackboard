import { editor, Uri } from './_vendor/monaco.js';

export class Store {
  light_theme = false;
  panes = { left: .2, right: .6, out: 1, map: 0 };
  auth = {
    pending: false,
    done: false,
    error: '',
    u: '',
    key: '',
  };
  tree = {};
  curr_treenode_path = null;
  // TODO track run_count for drafts, gc least used
  drafts_kv = {};
  stored_draft_ids = [];
  dirty_draft_ids = null;
  curr_draft_id = null;
  datum_focused = false;
  out = {
    frames: [].map(_ => ({
      curr_col_idx: -1,
      geom_col_idx: -1,
      cols: [],
      rows: [{
        tuple: [],
        updates: [],
        will_insert: false,
        will_delete: false,
      }],
    })),
    messages: [],
    curr_frame_idx: null,
    curr_row_idx: null,
    // TODO draft_ver: null,
    aborter: null,
    loading: false,
    suspended: null,
    db: null,
    // took_msec: 0,
  };

  resize_panes(update) {
    Object.assign(this.panes, update);
  }

  sync_datum_focused(value) {
    this.datum_focused = value;
  }

  async auth_submit(u, password) {
    this.auth = {
      pending: true,
      ok: false,
      error: null,
      u,
      key: null,
    };
    const auth = this.auth;
    try {
      // await new Promise(resolve => setTimeout(resolve, 3000));
      const { ok, error, key } = await this._api('auth', { u }, { password });
      if (!ok) {
        auth.error = error;
        return;
      }
      auth.key = key;
      // TODO concurent store mutation if multiple parallel .auth() called
      await this._load_tree_and_drafts();

      auth.ok = true;
    } catch (ex) {
      auth.error = String(ex);
    } finally {
      auth.pending = false;
    }
  }

  async _load_tree_and_drafts() {
    await this.tree_toggle([]);

    const initial_draft_id = this._add_draft(
      `\\connect postgres\n\n` +
      `SELECT * FROM pg_stat_activity;\n`,
    );
    this._unset_curr_draft();
    this.curr_draft_id = initial_draft_id;

    this._load_drafts();
    setInterval(_ => this._flush_drafts(), 10e3);
    globalThis.addEventListener('unload', _ => this._flush_drafts());
  }

  _load_drafts() {
    const storage = globalThis.localStorage; // TODO dry dep injection
    this.stored_draft_ids = (
      Object.keys(storage)
      .filter(k => /^pgblackboard_draft_/.test(k))
      .sort()
      .reverse()
    );
    for (const id of this.stored_draft_ids) {
      this._add_draft(storage.getItem(id), id);
    }
  }

  _flush_drafts() {
    // TODO gc drafts
    if (!this.dirty_draft_ids) return;
    const storage = globalThis.localStorage; // TODO dry dep injection
    for (const id in this.dirty_draft_ids) {
      if (this.stored_draft_ids.includes(id)) {
        const value = editor.getModel(this.get_draft_uri(id)).getValue();
        // TODO handle QuotaExceededError
        storage.setItem(id, value);
      } else {
        storage.removeItem(id);
      }
    }
    this.dirty_draft_ids = null;
  }

  _add_draft(content, draft_id) {
    draft_id ||= (
      'pgblackboard_draft_' // legacy v2 prefix
      + '_' // v2 suffix is not sortable because not zero padded, so push v3 drafts upper
      + Date.now().toString(16).padStart(16, '0')
    );
    const editor_model = editor.createModel(content, 'sql', this.get_draft_uri(draft_id));
    this.drafts_kv[draft_id] = {
      id: draft_id,
      loading: false,
      caption: '',
      cursor_pos: 0,
      cursor_len: 0,
    };
    const draft = this.drafts_kv[draft_id];
    editor_model.onDidChangeContent(update_caption);
    update_caption();
    return draft_id;

    function update_caption() {
      const pos = editor_model.getPositionAt(256);
      const head = editor_model.getValueInRange({
        startLineNumber: 0,
        startColumn: 0,
        endLineNumber: pos.lineNumber,
        endColumn: pos.column,
      });
      const { sql } = extract_dbname_from_sql(head);
      draft.caption = sql.trim();
      // draft.caption = head.replace(/^\s*\\connect[\s\t]+[^\n]+\n/, '\u2026 ');
    }
  }

  get_draft_uri(draft_id) {
    return Uri.parse('//pgbb/' + draft_id);
  }

  save_curr_draft() {
    this.dirty_draft_ids ||= {};
    this.dirty_draft_ids[this.curr_draft_id] = true;
    if (!this.stored_draft_ids.includes(this.curr_draft_id)) {
      this.stored_draft_ids.unshift(this.curr_draft_id);
      this.curr_treenode_path = null;
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
    const { u, key } = this.auth;
    try {
      const { result } = await this._api('tree', { u, db, node: id, key });
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
    const editor_model = editor.getModel(this.get_draft_uri(draft_id));
    this._unset_curr_draft();
    this.curr_draft_id = draft_id;
    this.curr_treenode_path = path;
    const node = path.reduce(
      ({ children }, idx) => children.value[idx],
      this.tree,
    );
    const { db, id } = node;
    const { u, key } = this.auth;
    const content = await this._api('defn', { u, db, node: id, key }).then(
      ({ result }) => result || '',
      err => `/* ${err} */\n`,
    );
    // TODO indicate dead treenode when treenode not found
    if (!editor_model.isDisposed()) {
      editor_model.setValue(content);
    }
    draft.loading = false;
  }

  async _api(api, qs, body) {
    qs = JSON.parse(JSON.stringify(qs)); // rm undefined
    const resp = await fetch('?' + new URLSearchParams({ api, ...qs }), {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
    });
    if (!resp.ok) throw Error(`${resp.status} ${resp.statusText}`);
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
      editor.getModel(this.get_draft_uri(this.curr_draft_id)).dispose();
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
    editor.getModel(this.get_draft_uri(draft_id)).dispose();
    this.dirty_draft_ids ||= {};
    this.dirty_draft_ids[draft_id] = true;
    if (draft_id == this.curr_draft_id) {
      // TODO
      this.curr_draft_id = null;
    }
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
    this.out.frames[frame_idx].rows[row_idx].will_delete = true;

    // const row = this.out.frames[frame_idx].rows[row_idx];
    // row.will_delete = !row.will_delete;
  }

  revert_row(frame_idx, row_idx) {
    const { rows } = this.out.frames[frame_idx];
    const row = rows[row_idx];
    row.will_delete = false;
    row.updates = [];
    if (row.will_insert) {
      rows.splice(row_idx, 1);
    }
  }

  // edit_datum(frame_idx, row_idx, col_idx, new_value) {
  //   const rows = this.out.frames[frame_idx].rows;
  //   rows[row_idx] ||= { dirty: 'insert', tuple: [], updates: [] };
  //   const row = rows[row_idx];
  //   row.dirty ||= 'update';
  //   row.updates[col_idx] = new_value;
  // }

  edit_datum(frame_idx, row_idx, col_idx, new_value) {
    const rows = this.out.frames[frame_idx].rows;
    rows[row_idx] ||= {
      tuple: [],
      updates: [],
      will_insert: true,
      will_delete: false,
    };
    const row = rows[row_idx];
    // TODO same column can be selected multiple times
    // so att_name should be used instead of col_idx to identify updated datum
    row.updates[col_idx] = new_value;
  }

  get_changes_num() {
    let count = 0;
    // for (const { rows } of this.out.frames) {
    //   for (const { dirty } of rows) {
    //     if (dirty) {
    //       count++;
    //     }
    //   }
    // }
    // return count;

    for (const { rows } of this.out.frames) {
      for (const { will_insert, will_delete, updates } of rows) {
        if (will_insert || will_delete || updates.length) {
          count++;
        }
      }
    }
    return count;
  }

  dump_changes() {
    let script = `\\connect ${this.out.db}\n\nBEGIN READ WRITE;\n\n`;

    for (const frame of this.out.frames) {
      const key_idxs = frame.cols
        .map((col, i) => col.att_key && i)
        .filter(Number.isInteger);
      const key_names = tuple_expr(key_idxs.map(i => frame.cols[i].att_name));

      const delete_keys = [];
      const update_keys = [];
      const update_stmts = [];
      const insert_stmts = [];
      for (const {
        will_insert,
        will_delete,
        dirty,
        tuple,
        updates,
      } of frame.rows) {
        const key_vals = tuple_expr(key_idxs.map(i => literal(tuple[i])));
        if (will_delete) {
          delete_keys.push(key_vals);
          continue;
        }
        if (will_insert) {
          const cols = [];
          const vals = [];
          for (const [col_idx, col] of frame.cols.entries()) {
            const val = updates[col_idx];
            if (val === undefined) continue;
            vals.push(literal(val));
            cols.push(col.att_name);
          }
          insert_stmts.push(
            `INSERT INTO ${frame.rel_name} (${cols.join(', ')})\n` +
            `VALUES (${vals.join(', ')});\n\n`,
          );
          continue;
        }
        if (updates.length) {
          const set_entries = [];
          for (const [col_idx, col] of frame.cols.entries()) {
            const upd_value = updates[col_idx];
            if (upd_value === undefined) continue;
            set_entries.push(`${col.att_name} = ${literal(upd_value)}`);
          }
          update_stmts.push(
            `UPDATE ${frame.rel_name}\n` +
            `SET ${set_entries.join('\n  , ')}\n` +
            `WHERE ${key_names} = ${key_vals};\n\n`,
          );
          update_keys.push(key_vals);
          continue;
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
        script += (
          `SELECT * FROM ${frame.rel_name}\n` +
          `WHERE ${key_names} IN (\n  ${update_keys.join(',\n  ')}\n);\n\n`
        );
      }
      script += insert_stmts.join('');
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
    return Boolean(this.out.aborter);
  }

  abort() {
    this.out.aborter.abort();
  }

  can_wake() {
    return Boolean(this.out.suspended);
  }

  async wake() {
    const token = this.out.suspended.wake_token;
    await this._api('wake', { token });
  }

  can_run() {
    return !this.out.loading && !this.curr_draft?.loading;
  }

  async run({ rw }) {
    this.out = {
      db: null,
      frames: [],
      messages: [],
      curr_frame_idx: null,
      curr_row_idx: null,
      aborter: new AbortController(),
      loading: true,
      suspended: null,
    };
    const out = this.out;

    try {
      const draft = this.curr_draft;
      const { cursor_pos, cursor_len } = draft;
      const editor_model = editor.getModel(this.get_draft_uri(this.curr_draft_id));
      const editor_text = editor_model.getValue();

      let { db, sql } = extract_dbname_from_sql(editor_text);
      if (db == null) {
        throw Error(`missing \\connect meta-command in first line`);
      }
      out.db = db;

      if (cursor_len) {
        const [from, to] = [cursor_pos, cursor_pos + cursor_len].sort((a, b) => a - b);
        sql = '\n'.padStart(from, ' ') + sql.slice(from, to);
      }

      const { u, key } = this.auth;
      const qs = new URLSearchParams({ api: 'run', u, db, key });
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const body = JSON.stringify({ sql, tz, rw });
      const resp = await fetch('?' + qs, {
        method: 'POST',
        signal: out.aborter.signal,
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body,
      });
      if (!resp.ok) throw Error(`HTTP ${resp.status} ${resp.statusText}`, { cause: await resp.text() });
      const msg_stream = iter_stream(
        resp.body
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(new JSONDecodeStream()),
      );
      let frame = null;
      for await (const [tag, payload] of msg_stream) {
        out.suspended = null;
        switch (tag) {
          case 'head':
            out.frames.push({
              rel_name: payload.rel_name,
              cols: payload.cols.map(col => ({ ...col, width: 150 })),
              curr_col_idx: Boolean(payload.cols.length) - 1,
              geom_col_idx: payload.cols.findIndex(col => /^st_asgeojson$/i.test(col.name)),
              rows: [],
            });
            frame = out.frames.at(-1);
            break;
          // TODO CopyData
          case 'rows':
            // TODO set selected frame_idx/row_idx/col_idx
            frame.rows.push(...payload.map(tuple => ({
              tuple,
              updates: [],
              will_insert: false,
              will_delete: false,
            })));
            break;
          case 'complete':
          case 'error':
          case 'notice':
            out.messages.push({ tag, payload });
            break;
          case 'suspended':
            out.suspended = payload;
            break;
        }
      }
    } catch (err) {
      out.messages.push({
        tag: 'error',
        payload: {
          severityEn: 'ERROR',
          severity: 'ERROR', // TODO non localized
          code: 'E_PGBB_FRONTEND',
          message: String(err),
          detail: err?.stack, // TODO .cause
        },
      });
    } finally {
      out.loading = false;
      out.aborter = null;
      out.suspended = null;
    }
  }
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
async function* iter_stream(stream) {
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

function extract_dbname_from_sql(sql) {
  let db;
  sql = sql.replace(/^\s*\\connect\s+(\w+|("[^"]*")+)/, (a, q_dbname) => {
    db = q_dbname; // TODO unquote
    return ' '.repeat(a.length);
  });
  return { db, sql };
}
