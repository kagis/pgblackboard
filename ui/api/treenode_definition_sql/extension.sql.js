-- NaN; define((_r, _e, module) => { module.exports = `

select 'CREATE EXTENSION IF NOT EXISTS ' || quote_ident(extname)  || e';\n' as def
from pg_extension
where oid = $1

-- `.trim().slice(0, -2); });
