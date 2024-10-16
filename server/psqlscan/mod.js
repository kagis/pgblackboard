import wasm_source_b64 from './psqlscan.wasm.js';

const wasm_source = Uint8Array.from(atob(wasm_source_b64), x => x.charCodeAt());
const wasm = await WebAssembly.instantiate(wasm_source, {
  wasi_snapshot_preview1: {
    proc_exit() { throw Error('unimplemented'); },
    // https://wasix.org/docs/api-reference/wasi/fd_fdstat_get
    fd_fdstat_get(fd, buf_ptr) { throw Error('unimplemented', { cause: { fn: 'fd_fdstat_get', fd, buf_btr: buf_ptr } }); },
    fd_read() { throw Error('unimplemented'); },
    fd_close() { throw Error('unimplemented'); },
    fd_seek() { throw Error('unimplemented'); },
    // https://wasix.org/docs/api-reference/wasi/fd_write
    fd_write(fd, iovs, iovs_len, nwritten) { throw Error('unimplemented'); },
  },
});

const { memory, psql_stmt_len, malloc, free } = wasm.instance.exports;
const utf8d = new TextDecoder();
const utf8e = new TextEncoder();

// TODO stream mode
export function psqlscan_split(sql) {
  const input_cap = sql.length * 3;
  const input_p = malloc(input_cap);
  try {
    const input_buf = new Uint8Array(memory.buffer, input_p, input_cap);
    const { written } = utf8e.encodeInto(sql, input_buf);
    const res = [];
    for (let of = 0; of < written; ) {
      const len = psql_stmt_len(input_p + of, written - of);
      res.push(utf8d.decode(input_buf.subarray(of, of + len)));
      of += len;
    }
    return res;
  } finally {
    free(input_p);
  }
}

// console.log(psqlscan_split(String.raw `
//   begin read write;

//   create or Replace function hello(lang text)
//   returns text /* ; */ -- ;
//   begin atomic;
//     select case lang
//       when 'ru' then e''
//       '\'привет;\''
//       else $$hello;$$
//     end;
//   end;

//   select hello('ru');

//   rollback
// `));
