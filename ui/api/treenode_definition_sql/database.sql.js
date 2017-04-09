-- NaN; define((_r, _e, module) => { module.exports = `

select 'SELECT ''awesome'';' as def
from pg_database
where datname = $1

-- `.trim().slice(0, -2); });
