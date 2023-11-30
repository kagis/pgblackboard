async function handle_req(req) {
  let pg;
  try {
    pg = await pgconnect('postgres://example');
    await pg.query(`begin`);

    const [data_exists] = await pg.query(`select true from data limit 1`);
    if (!data_exists) {
      return new Response('not found', { status: 404 });
    }

    const resp = new Response(
      readableStreamFromIterable(
        generate_response_body(pg),
      ),
    );
    pg = null;
    return resp;

  } finally {
    await pg?.end();
  }
}

async function * generate_response_body(pg) {
  try {

  } finally {
    await pg.end();
  }
}
