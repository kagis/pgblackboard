import { editor, Uri } from './_lib/monaco.js';

export class Store {

  light_theme = false;
  panes = { left: .2, right: .6, out: 1, map: 0 };
  tree = {};
  curr_treenode_path = null;
  login_pending = false;
  login_done = false;
  login_error = '';
  // TODO track run count for drafts, gc least used
  drafts_kv = {};
  stored_draft_ids = [];
  dirty_draft_ids = null;
  curr_draft_id = null;
  out = {
    frames: [{
      curr_col_idx: -1,
      geom_col_idx: -1,
      cols: [],
      status: 'SELECT 1',
      rows: [{
        edit: 'update',
        tuple: [],
        updates: [],
      }],
    }].slice(0, 0),
    curr_frame_idx: null,
    curr_row_idx: null,
    // draft_ver: null,
    error_pos: null,
    loading: false,
    aborter: null,
  };

  resize_panes(update) {
    Object.assign(this.panes, update);
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
      this.set_curr_draft(initial_draft_id);

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
    this.set_curr_draft(draft_id);
    this.curr_treenode_path = path;
    const node = path.reduce(({ children }, idx) => children.value[idx], this.tree);
    const { db, id } = node;
    const content = await (
      this._api('defn', { u: this._user, db, node: id, key: this._key })
      .then(({ result }) => result || '', err => `/* ${err} */\n`)
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

  set_curr_draft(draft_id) {
    if (
      this.curr_draft_id in this.drafts_kv &&
      !this.stored_draft_ids.includes(this.curr_draft_id)
    ) {
      delete this.drafts_kv[this.curr_draft_id];
      editor.getModel(this.curr_draft_id).dispose();
    }
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
    // this.drafts.dirty[draft_id] = true;
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

  edit_delete_flag(frame_idx, row_idx) {
    // this.outs[frame_idx].edits[row_idx].kind = 'delete';
  }

  edit_datum(frame_idx, row_idx, col_idx, new_value) {
    const row = this.out.frames[frame_idx].rows[row_idx];
    row.dirty = 'update';
    row.updates[col_idx] = new_value;
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

  async run() {
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
      frames: [],
      curr_frame_idx: null,
      curr_row_idx: null,
      error_pos: null,
      loading: true,
      aborter,
    };
    const out = this.out;

    try {
      const qs = new URLSearchParams({ api: 'exec', u: this._user, db, key: this._key });
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const body = JSON.stringify({ sql, tz });
      const resp = await fetch('?' + qs, { method: 'POST', body, signal: aborter.signal });
      if (!resp.ok) throw Error('HTTP Error', { cause: await resp.text() });
      const msg_stream = (
        resp.body
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(new JSONDecodeStream())
      );
      let frame = null;
      for await (const { tag, payload, rows } of iter_stream(msg_stream)) {
        // console.log(tag);
        if (!frame) {
          out.frames.push({
            cols: null,
            status: null,
            rows: [],
            geom_col_idx: -1,
            curr_col_idx: -1,
            notices: [],
          });
          frame = out.frames.at(-1);
        }
        switch (tag) {
          case 'RowDescription':
            frame.cols = payload.map(col => ({ ...col, width: 150 }));
            frame.curr_col_idx = payload.length ? 0 : -1;
            frame.geom_col_idx = payload.findIndex(col => /^st_asgeojson$/i.test(col.name));
            break;
          case 'DataRow':
            // TODO set selected frame_idx/row_idx/col_idx
            frame.rows.push(...rows.map(tuple => ({ tuple, updates: [], dirty: null })));
            break;
          case 'NoticeResponse':
            frame.notices.push(payload);
            break;
          case 'ErrorResponse':
            out.error_pos = payload.position && payload.position - 1;
          case 'CommandComplete':
            frame.status = payload;
            frame = null;
            break;
          case '.types':
            for (const frame of out.frames) {
              for (const col of frame.cols || []) {
                const typeKey = `${col.typeOid}/${col.typeMod}`; // TODO move to server col.typeKey
                col.typeName = payload[typeKey];
              }
            }
            break;
          // TODO EmptyQuery, PortalSuspended
        }
      }
    } catch (err) {
      out.frames.push({ status: err });
    } finally {
      out.aborter = null;
      out.loading = false;
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

// class DraftsRepo {
//   constructor(storage) {
//     this._storage = storage;
//   }

//   getall() {
//     const ids = JSON.parse(this._storage.getItem('pgbb:draft:_ids')) || [];
//     return ids.map(id => ({ id, content: this._storage.getItem(id) }));
//   }

//   create(content) {
//     const id = 'pgbb:draft:' + Date.now().toString(16).padStart(16, 0);
//     // this.update(id, content);
//     return id;
//   }

//   update(id, content) {
//     this._storage.setItem(id, content);
//   }

//   remove(id) {

//   }

//   bump(id) {

//   }
// }
