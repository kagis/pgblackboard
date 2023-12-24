import { editor, Uri } from './_lib/monaco.js';

// export class Store1 {

//   constructor() {
//     const ls = localStorage;

//     /** @type {string[]} */
//     const persisted_draft_ids = JSON.parse(ls.getItem('pgbb:draft:_ids')) || [];
//     for (const id of persisted_draft_ids) {
//       const content = ls.getItem(id);
//       editor.createModel(content, 'sql', id);
//     }
//     const drafts_kv = Object.fromEntries(persisted_draft_ids.map(id => [id, {
//       preview: editor.getModel(id).getValue().slice(0, 100),
//       loading: false,
//       // dirty: false,
//       code_cursor: 0,
//       code_selection: 0,
//       outs: [],
//       curr_out_idx: null,
//       curr_row_idx: null,
//     }]));

//     this._reactive = {
//       login_state: '',
//       login_error: null,
//       use_light_theme: false,
//       selected_draft_id: null,
//       persisted_draft_ids,
//       drafts_kv,
//       layout: { left: 300, right: 500, map: 200, datum: 100 },
//       tree: { children: { value: null, loading: false } },
//     };
//   }

//   async login(u, password) {
//     // TODO cancel previous pending req
//     this.login_pending = true;
//     this.login_error = '';
//     try {
//       // await new Promise(resolve => setTimeout(resolve, 3000));
//       const { ok, reason, key } = await this._api('login', { u }, { password });
//       if (!ok) return this.login_error = reason;
//       this._key = key;
//       this._user = u;
//       this.drafts = this._load_drafts();
//       await this.tree_toggle([]);
//       this.login_done = true;
//     } catch (err) {
//       this.login_error = String(err);
//     } finally {
//       this.login_pending = false;
//     }
//   }

//   set_split(arg) {
//     Object.assign(this._state.split, arg);
//   }
// }

export class Store {

  // async init() {
  //   this.light_theme = Boolean(localStorage.getItem('pgbb:light_theme'));
  // }

  // split_left = 300;
  // split_right = 500;
  // split_map = 200;
  // split_datum = 100;

  // set_split_left(value) {
  //   this.split_left = value;
  // }
  // set_split_right(value) {
  //   this.split_right = value;
  // }
  // set_split_map(value) {
  //   this.split_map = value;
  // }
  // set_split_datum(value) {
  //   this.split_datum = value;
  // }

  light_theme = false;
  panes = { left: .2, right: .6, outs: 1, map: 0 };
  tree = {};
  curr_treenode_path = null;
  login_pending = false;
  login_done = false;
  login_error = '';
  drafts_kv = {};
  stored_draft_ids = [];
  dirty_draft_ids = null;
  curr_draft_id = null;
  outs = [];
  curr_out_idx = null;
  curr_row_idx = null;

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
      this.login_done = true;
    } catch (err) {
      this.login_error = String(err);
    } finally {
      this.login_pending = false;
    }

    this._load_drafts();
    setInterval(_ => this._flush_drafts(), 10e3);
    window.addEventListener('unload', _ => this._flush_drafts());

    const initial_draft_id = this._add_draft(
      `\\connect postgres\n\n` +
      `SELECT * FROM pg_stat_activity;\n`,
    );
    this.set_curr_draft(initial_draft_id);
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

  // code = {
  //   key: null,
  //   loading: false,
  //   selection: null,
  // };

//   code = {
//     loading: false,
//     content: String.raw /*sql*/ `\connect geoportalkz
// --pgbb-basemap https://tile0.maps.2gis.com/tiles?x={x}&y={y}&z={z}&v=1.4&r=g&ts=online_hd

// -- select * from feature limit 100;
// -- select pg_sleep(3);
// -- select 'hello';
// -- select 1 where false;
// -- select * from feature limit 100;

// SELECT *, st_asgeojson(geom)
// FROM adm.admrayon
// ORDER BY admrayon_id
// LIMIT 10 OFFSET 0
// ;

// SELECT row_number() over(), *,  st_asgeojson(geom)
// FROM nedb.school_list
// where geom is not null
// LIMIT 500 OFFSET 0
// ;
// `,
//   };

  // edit_code(content) {
  //   this.code.error_at = null;
  //   this.code.content = content;
  //   this.selected_treenode_path = null;
  //   this.selected_draft_id ||= (
  //     this.drafts.ids.unshift('pgbb:draft:' + Date.now().toString(16).padStart(16)),
  //     this.drafts.ids[0]
  //   );
  //   this.drafts[this.selected_draft_id] = content;
  //   this.drafts.dirty[this.selected_draft_id] = true;
  // }


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

  resize_col(out_idx, col_idx, width) {
    this.outs[out_idx].columns[col_idx].width = width;
  }

  // TODO set_curr_row
  set_curr_rowcol(out_idx, row_idx, col_idx) {
    this.curr_out_idx = out_idx;
    this.curr_row_idx = row_idx;
    // TODO set null if out_idx changed
    // this.curr_col_idx = col_idx;
    const out = this?.outs[out_idx];
    if (out && col_idx != null) {
      out.curr_col_idx = col_idx;
    }
  }

  get curr_datum() {
    const out = this.outs?.[this.curr_out_idx];
    if (!out) return;
    // const col = out.columns?.[out.curr_col_idx];
    return out.rows[this.curr_row_idx]?.[out.curr_col_idx];
  }

  // theme = 'dark';
  toggle_theme() {
    this.light_theme = !this.light_theme;
    // this.theme = this.theme == 'dark' ? 'light' : 'dark';
  }

  // bump_draft(draft_id) {
  //   const { ids } = this.drafts;
  //   const idx = ids.indexOf(draft_id);
  //   ids.splice(idx, 1);
  //   ids.unshift(draft_id);
  // }

  // bump_working_draft() {
  //   if (this.selected_draft_id) {
  //     const id = this.selected_draft_id;
  //     this.drafts.ids.sort((a, b) => (b == id) - (a == id));
  //   } else {
  //     const id = 'pgbb:draft:' + Date.now().toString(16).padStart(14, 0);
  //     this.drafts[id] = { content: this.query.content };
  //     this.drafts.ids.unshift(id);
  //     this.selected_draft_id = id;
  //     this.selected_treenode_path = null;
  //   }
  // }

  can_abort() {
    return Boolean(this._abortctl);
  }

  abort() {
    this._abortctl.abort();
  }

  can_run() {
    return !this._abortctl && !this.curr_draft?.loading;
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

    const { outs } = Object.assign(this, {
      outs: [],
      curr_out_idx: null,
      curr_row_idx: null,
    });

    draft.error_pos = null;

    try {
      const qs = new URLSearchParams({ api: 'exec', u: this._user, db, key: this._key });
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const body = JSON.stringify({ sql, tz });
      const { signal } = this._abortctl = new AbortController();
      const resp = await fetch('?' + qs, { method: 'POST', body, signal });
      if (!resp.ok) throw Error('HTTP Error', { cause: await resp.text() });
      const msg_stream = (
        resp.body
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(new JSONDecodeStream())
      );
      let curr = null;
      for await (const { tag, payload, rows } of iter_stream(msg_stream)) {
        console.log(tag);
        curr ||= (
          outs.push({ columns: null, geometry_col: null, rows: [], status: null }),
          outs.at(-1)
        );
        switch (tag) {
          case 'RowDescription':
            curr.columns = payload.map(col => ({ ...col, width: 150 }));
            curr.geometry_col = payload.findIndex(col => /^st_asgeojson$/i.test(col.name));
            break;
          case 'DataRow':
            // TODO set selected out_idx/row_idx/col_idx
            curr.rows.push(...rows);
            break;
          case 'ErrorResponse':
            draft.error_pos = payload.position && payload.position - 1;
          case 'CommandComplete':
            curr.status = payload;
            curr = null;
            break;
        }
      }
    } catch (err) {
      outs.push({ status: err });
    } finally {
      this._abortctl = null;
    }
    // console.log(out);
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
