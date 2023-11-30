export class Store {
  splitl = 300;
  splitr = 500;
  splitv = 500;

  set_splitl(value) {
    this.splitl = value;
  }
  set_splitr(value) {
    this.splitr = value;
  }
  set_splitv(value) {
    this.splitv = value;
  }

  tree = {};
  login_pending = false;
  login_done = false;
  login_error = '';

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
      this.drafts = this._load_drafts();
      await this.tree_toggle([]);
      this.login_done = true;
    } catch (err) {
      this.login_error = String(err);
    } finally {
      this.login_pending = false;
    }
  }

  _load_drafts() {
    const storage = localStorage;
    const ids = JSON.parse(storage.getItem('pgbb:draft:_ids')) || [];
    const entries = ids.map(id => [id, storage.getItem(id)]);
    return { ids, dirty: {}, ...Object.fromEntries(entries) };
  }

  // _draftsrepo = new DraftsRepo(localStorage);

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

  async tree_select(path) {
    const { code } = Object.assign(this, {
      code: { loading: true, content: `-- loading ...\n` },
      selected_treenode_path: path,
      selected_draft_id: null,
    });
    const node = path.reduce(({ children }, idx) => children.value[idx], this.tree);
    const { db, id } = node;
    try {
      const { result } = await this._api('defn', { u: this._user, db, node: id, key: this._key });
      code.content = result;
    } finally {
      code.loading = false;
    }
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

  outs = [];

  // workspace document script context tab
  // drafts = {
  //   '1': { content: `--connect postgres\nselect 'hello';\n` },
  //   '2': { content: `--connect postgres\nselect 'world';\n` },
  //   '3': { content: `--connect postgres\nselect 'bonjour';\n` },
  // };

  drafts = { ids: [] };

  selected_draft_id = null;

  code = {
    loading: false,
    content: String.raw /*sql*/ `\connect geoportalkz
--pgbb-basemap https://tile0.maps.2gis.com/tiles?x={x}&y={y}&z={z}&v=1.4&r=g&ts=online_hd

-- select * from feature limit 100;
-- select pg_sleep(3);
-- select 'hello';
-- select 1 where false;
-- select * from feature limit 100;

SELECT *, st_asgeojson(geom)
FROM adm.admrayon
ORDER BY admrayon_id
LIMIT 10 OFFSET 0
;

SELECT row_number() over(), *,  st_asgeojson(geom)
FROM nedb.school_list
where geom is not null
LIMIT 500 OFFSET 0
;
`,
  };

  edit_code(content) {
    this.code.error_at = null;
    this.code.content = content;
    this.selected_treenode_path = null;
    this.selected_draft_id ||= (
      this.drafts.ids.unshift('pgbb:draft:' + Date.now().toString(16).padStart(16)),
      this.drafts.ids[0]
    );
    this.drafts[this.selected_draft_id] = content;
    this.drafts.dirty[this.selected_draft_id] = true;
  }

  set_selection(cursor, selected) {
    Object.assign(this.code, { cursor, selected });
  }

  select_draft(draft_id) {
    const content = this.drafts[draft_id];
    this.code = { content, loading: false, cursor: 0, selected: 0 };
    this.selected_draft_id = draft_id;
    this.selected_treenode_path = null;
  }

  delete_draft(draft_id) {
    const idx = this.drafts.ids.indexOf(draft_id);
    this.drafts.ids.splice(idx, 1);
    delete this.drafts[draft_id];
    this.drafts.dirty[draft_id] = true;
    if (draft_id == this.selected_draft_id) {
      // TODO
    }
  }

  resize_col(out_idx, col_idx, width) {
    this.outs[out_idx].columns[col_idx].width = width;
  }

  selected_row = null;

  select_rowcol(out_idx, row_idx, col_idx = this.selected_col_idx) {
    this.selected_row = [out_idx, row_idx];
    this.selected_out_idx = out_idx;
    this.selected_row_idx = row_idx;
    // TODO set null if out_idx changed
    this.selected_col_idx = col_idx;
  }

  get selected_datum() {
    const col = this.outs?.[this.selected_out_idx]?.columns?.[this.selected_col_idx];
    return this.outs?.[this.selected_out_idx]?.rows[this.selected_row_idx]?.[this.selected_col_idx];
  }

  theme = 'dark';
  toggle_theme() {
    this.theme = this.theme == 'dark' ? 'light' : 'dark';
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
    return !this._abortctl && !this.code.loading;
  }

  async run() {
    const { outs } = Object.assign(this, {
      outs: [],
      selected_row: null,
      selected_out_idx: null,
      selected_row_idx: null,
      selected_col_idx: null,
    });

    const { code } = this;
    code.error_at = null;

    const { content, cursor, selected } = code;
    let sql = String(content);

    const m = /^\s*\\connect\s+(\w+|("[^"]*")+)/.exec(sql);
    const [, db] = m;
    const cl = m[0].length;
    // TODO database name can contain non ascii (more wide)
    sql = ' '.repeat(cl) + sql.slice(cl);

    // if (sel_from != sel_to) {
    //   sql =  '\n'.padStart(sel_from, ' ') + sql.slice(sel_from, sel_to);
    // }
    if (selected) {
      const [from, to] = [cursor, cursor + selected].sort((a, b) => a - b);
      sql = '\n'.padStart(from, ' ') + sql.slice(from, to);
    }
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
            curr.rows.push(...rows);
            break;
          case 'ErrorResponse':
            code.error_at = payload.position && payload.position - 1;
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
  }
  finally {
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
