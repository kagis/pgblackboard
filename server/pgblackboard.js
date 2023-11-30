import { parse_flags, http_serve_dir, pgconnect } from './deps.js';

async function main(args) {
  const flags = parse_flags(args, {
    default: {
      'listen-port': '7890',
    },
  });

  const app = new App();
  app.pg_uri = flags._[0];

  await app.init();

  const server = Deno.serve({
    hostname: flags['listen-addr'],
    port: Number(flags['listen-port']),
    handler: app.handle_req.bind(app),
  });

  await server.finished;
}

// POST /?api=login&u=v.nezhutin&tz=Asia/Almaty
// POST /?api=tree&u=v.nezhutin&tz=Asia/Almaty&db=postgres&node=db.postgres&key=cafebabe
// POST /?api=defn&u=v.nezhutin&tz=Asia/Almaty&db=postgres&node=db.postgres&key=cafebabe
// POST /?api=exec&u=v.nezhutin&tz=

class App {
  // pg_conn_defaults = {
  //   statement_timeout: '10s',
  //   default_transaction_read_only: 'on',
  // };
  pg_uri;
  _pwd_key;

  async init() {
    this._pwd_key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );
  }

  handle_req(/** @type {Request} */ req) {
    const url = new URL(req.url);
    console.log(req.method, url.pathname, url.search);
    if (req.method == 'POST' && url.pathname == '/') {
      return this._handle_api(req, url);
    }
    return http_serve_dir(req, { fsRoot: 'ui', quiet: true });
  }

  async _handle_api(/** @type {Request} */ req, url) {
    const qs = Object.fromEntries(url.searchParams);
    const { api } = qs;
    switch (api) {
      case 'login': return this._api_login(req, qs);
      case 'tree': return this._api_tree(req, qs);
      case 'defn': return this._api_defn(req, qs);
      case 'exec': return this._api_exec(req, qs);
    }
    return Response.json({ error: 'uknown api' }, { status: 404 });
  }

  async _api_login(req, { u }) {
    const { password } = await req.json(); // base64 ?
    let pg;
    try {
      pg = await pgconnect({ password, user: u, _debug: true }, this.pg_uri);
    } catch (err) {
      console.error(err);
      return Response.json({ ok: false, reason: err.message });
    }
    await pg.end();
    const key = await this._encrypt_pwd(password);
    return Response.json({ ok: true, key });
  }

  async _encrypt_pwd(plain) {
    const utf8 = new TextEncoder().encode(plain);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc_pwd = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, this._pwd_key, utf8);
    const b64 = btoa(String.fromCharCode(...iv,  ...new Uint8Array(enc_pwd)));
    return b64.replace(/[+]/g, '-').replace(/[/]/g, '_').replace(/=+$/g, '');
  }

  async _decrypt_pwd(cipher) {
    cipher = cipher.replace(/-/g, '+').replace(/_/g, '/');
    const key_u8 = Uint8Array.from(atob(cipher), x => x.charCodeAt());
    const iv = key_u8.subarray(0, 12);
    const pld = key_u8.subarray(12);
    const utf8 = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, this._pwd_key, pld);
    return new TextDecoder().decode(utf8);
  }

  async _api_tree(/** @type {Request} */ _req, { key, u, db, node }) {
    const password = await this._decrypt_pwd(key);
    const conn_opts = {
      statement_timeout: '10s',
      default_transaction_read_only: 'on',
      user: u,
      password,
      database: db,
    };
    const node_arr = node?.split('.');
    const pg = await pgconnect(conn_opts, this.pg_uri);
    try {
      const { rows } = await pg.query({
        statement: tree_sql,
        params: [{ type: 'text[]', value: node_arr }],
      });
      const result = rows.map(([db, id, type, name, comment, expandable]) => ({
        type,
        id: id.join('.'),
        db,
        name,
        comment,
        expandable,
      }));
      return Response.json({ result });
    } finally {
      await pg.end();
    }
  }

  async _api_defn(/** @type {Request} */ _req, { key, u, db, node }) {
    const password = await this._decrypt_pwd(key);

    const node_arr = node.split('.');
    const pg = await pgconnect({
      default_transaction_read_only: 'on',
      user: u,
      password,
      database: db,
    }, this.pg_uri, {
      statement_timeout: '10s',
    });
    try {
      const [result] = await pg.query({
        statement: defn_sql,
        params: [{ type: 'text[]', value: node_arr }],
      });
      return Response.json({ result });
    } finally {
      await pg.end();
    }
  }

  async _api_exec(/** @type {Request} */ req, { key, u, db }) {
    const password = await this._decrypt_pwd(key);

    const { sql, tz } = await req.json();
    const body = (
      ReadableStream.from(this._api_exec_body(sql, u, password, db, tz))
      .pipeThrough(new TextEncoderStream())
    );
    return new Response(body, {
      headers: {
        'content-type': 'text/plain; charset=utf-8', // TODO application/json
        'x-accel-buffering': 'no', // disable nginx buffering
        'cache-control': 'no-transform', // prevent buffering caused by gzip
      },
    });
  }

  async * _api_exec_body(sql, user, password, database, tz) {
    try {
      const pg = await pgconnect(
        { user, database, password },
        this.pg_uri,
        { 'TimeZone': tz, statement_timeout: '10s', default_transaction_read_only: 'on', _debug: false },
      );

      // let end_stdin = Boolean;
      // async function * stdin() {
      //   await new Promise(resolve => end_stdin = resolve);
      // }

      try {
        const stream = pg.stream(sql,
          // { stdin: stdin() }
        );
        for await (const chunk of stream) {
          // TODO pgwire should emit ErrorResponse chunk
          yield JSON.stringify(chunk);
          yield '\n';
          // console.log(chunk);
        }
      } finally {
        console.log('ending connection');
        await pg?.end();
      }
    } catch (err) {
      // TODO should not expose all errors, console.error only ?
      // console.error(err);
      const pgerr = err?.[Symbol.for('pg.ErrorResponse')];
      if (pgerr) {
        yield JSON.stringify({ tag: 'ErrorResponse', payload: pgerr });
      } else {
        yield JSON.stringify({ tag: 'ErrorResponse', payload: err.message, error: err.name });
      }
      yield '\n';
    }
  }
}

// db, postgres
// ns, postgres, 1
// rel, postgres, 2
// col, postgres, 2, 1
// fn, postgres, 10

const tree_sql = /*sql*/  `
  with arg (currdb, a1, a2, a3, a2_oid) as (
    select current_database(), $1[1], $1[2], $1[3]
      , case when $1[2] similar to '[0-9]+' then $1[2]::oid end
  )

  -- databases
  select datname, array['db']::text[]
    , 'database'
    , datname::text
    , shobj_description(oid, 'pg_database')
    , true
    , 1
  from pg_database
  where $1 is null and not datistemplate

  -- schemas
  union all
  select currdb, array['ns', oid]::text[]
    , 'schema'
    , nspname
    , obj_description(oid, 'pg_namespace')
    , true
    , 1
  from arg, pg_namespace
  where 'db' = a1 and nspname not like all (array[
    'pg\_toast',
    'pg\_temp\_%',
    'pg\_toast\_temp\_%'
  ])

  -- functions
  union all
  select currdb, array['fn', pg_proc.oid]::text[]
    , case when pg_aggregate is null then 'func' else 'agg' end
    , format(
      '%s(%s) → %s'
      , proname
      , pg_get_function_identity_arguments(pg_proc.oid)
      -- TODO fix no result type when procedure
      , pg_get_function_result(pg_proc.oid)
    )
    , obj_description(pg_proc.oid, 'pg_proc')
    , false
    , 2
  from arg, pg_proc
  left join pg_aggregate on aggfnoid = pg_proc.oid
  where ('ns', pronamespace) = (a1, a2_oid)

  -- tables
  union all
  select currdb, array['rel', pg_class.oid]::text[]
    , format('table table_%s', relkind)
    , relname
    , obj_description(pg_class.oid, 'pg_class')
    , true
    , 1
  from arg, pg_class
  where ('ns', relnamespace) = (a1, a2_oid)
    and relkind not in ('i', 'I', 't', 'c', 'S')

  -- columns
  union all
  select currdb, array['col', attrelid, attnum]::text[]
    , concat_ws(' '
      , 'column'
      , (
        select 'column_pk'
        from pg_constraint
        where conrelid = attrelid and contype = 'p' and attnum = any(conkey)
        -- limit 1
      )
    )
    , concat_ws(' '
      , attname
      , format_type(atttypid, atttypmod)
      , case when attnotnull then 'not null' end
    )
    , col_description(attrelid, attnum)
    , false
    , attnum
  from arg, pg_attribute
  left join pg_constraint pk on pk.conrelid = attrelid and pk.contype = 'p'
  where  ('rel', attrelid) = (a1, a2_oid)
    and attnum > 0 and not attisdropped

  -- constraints
  union all
  select currdb, array['constraint', oid]::text[]
    , concat_ws(' '
      , 'constraint'
      -- , format('constraint_%s', contype)
      , case when not convalidated then 'constraint_not_validated' end
    )
    , conname
    , obj_description(oid, 'pg_constraint')
    , false
    , 10010
  from arg, pg_constraint
  where ('rel', conrelid) = (a1, a2_oid)
    -- and contype not in ()

  -- indexes
  union all
  select currdb, array['index', indexrelid]::text[]
    , 'index'
    , relname
    , obj_description(indexrelid, 'pg_class')
    , false
    , 10020
  from arg, pg_index join pg_class on indexrelid = oid
  where ('rel', indrelid) = (a1, a2_oid)

  -- triggers
  union all
  select currdb, array['trigger', oid]::text[]
      -- TODO tgenabled=D
    , 'trigger'
    , tgname
    , obj_description(oid, 'pg_trigger')
    , false
    , 10030
  from arg, pg_trigger
  where ('rel', tgrelid) = (a1, a2_oid) and tgconstraint = 0

  order by 7, 4
`;


const defn_sql = String.raw /*sql*/ `
with arg (a1, a2, a3, a2_oid) as (
  select $1[1], $1[2], $1[3], case when $1[2] similar to '[0-9]+' then $1[2]::oid end
)
select format(e'\\connect %I\n\n%s', current_database(), def)
from arg, lateral (

  -- database
  select e'select ''hello world'';\n'
  where a1 = 'db'

  -- table
  union all
  select concat_ws(e'\n'
    , 'SELECT', select_cols
    , format('FROM %I.%I', nspname, relname)
    , 'ORDER BY ' || orderby_cols
    , 'LIMIT 1000', 'OFFSET 0'
    , ';', '', '/*'
    , (
      case relkind
      -- view
      when 'v' then format(
        e'CREATE OR REPLACE VIEW %I.%I AS\n%s'
        , nspname
        , relname
        , pg_get_viewdef(pg_class.oid, true)
      )
      else 'CREATE TABLE'
      end
    )
    , '*/', ''
  )
  from pg_class
  join pg_namespace on pg_class.relnamespace = pg_namespace.oid
  left join pg_constraint pk on (contype, conrelid) = ('p', pg_class.oid)
  , lateral (
    select string_agg(format('  %I', attname), e',\n' order by attnum)
      , string_agg(format('%I', attname), ', ' order by pk_pos) filter (where pk_pos is not null)
    from pg_attribute, array_position(pk.conkey, attnum) pk_pos
    where attrelid = pg_class.oid and attnum > 0 and not attisdropped
  ) _(select_cols, orderby_cols)
  where ('rel', pg_class.oid) = (a1, a2_oid)

  -- function
  union all
  select format(e''
    '%s;\n'
    '\n'
    '/*\n'
    'DROP FUNCTION %s(%s);\n'
    '*/\n'
    , pg_get_functiondef(pg_proc.oid)
    , pg_proc.oid::regproc
    , pg_get_function_identity_arguments(pg_proc.oid)
  )
  from pg_proc left join pg_aggregate on aggfnoid = pg_proc.oid
  where ('fn', pg_proc.oid) = (a1, a2_oid) and pg_aggregate is null

  -- aggregate
  union all
  select concat_ws(e'\n'
    , format('CREATE OR REPLACE AGGREGATE %s(%s) (', aggfnoid, fnargs)
    , '   SFUNC     = ' || aggtransfn
    , '  ,STYPE     = ' || format_type(aggtranstype, null)
    , '  ,FINALFUNC = ' || nullif(aggfinalfn, 0)::regproc
    , '  ,INITCOND  = ' || array_to_string(nullif(agginitval, '')::text[], ', ')
    , '  ,SORTOP    = ' || nullif(aggsortop, 0)::regoperator
    , ');'
    , ''
    , '/*'
    , format('DROP AGGREGATE %s(%s);', aggfnoid, fnargs)
    , '*/'
    , ''
  )
  from pg_aggregate, pg_get_function_identity_arguments(aggfnoid) fnargs
  where ('fn', aggfnoid) = (a1, a2_oid)

  -- constraint
  union all
  select format(e''
    'BEGIN;\n\n'
    'ALTER TABLE %s DROP CONSTRAINT %I;\n\n'
    'ALTER TABLE %1$s ADD CONSTRAINT %2$I %3$s;\n\n'
    'ROLLBACK;\n'
    , conrelid::regclass
    , conname
    , pg_get_constraintdef(oid)
  )
  from pg_constraint
  where ('constraint', oid) = (a1, a2_oid)

  -- index
  union all
  select format(e''
    'BEGIN;\n\n'
    'DROP INDEX %1$s;\n\n'
    '%s\n\n'
    'ROLLBACK;\n'
    , oid::regclass
    , pg_get_indexdef(oid)
  )
  from pg_class
  where ('index', oid) = (a1, a2_oid)

  -- trigger
  union all
  select format(e''
    'BEGIN;\n\n'
    'DROP TRIGGER %I ON %s;\n\n'
    '%s\n\n'
    'ROLLBACK;\n'
    , tgname
    , tgrelid::regclass
    , pg_get_triggerdef(oid, true)
  )
  from pg_trigger
  where ('trigger', oid) = (a1, a2_oid)

) _(def)
`;


if (import.meta.main) {
  await main(Deno.args);
}
