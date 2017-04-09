-- NaN; define((_r, _e, module) => { module.exports = `

select concat_ws(e'\n'
    ,'BEGIN;'
    ,''
    ,'-- select and execute following line to drop index'
    ,'DROP INDEX ' || oid::regclass || ';'
    ,''
    ,pg_get_indexdef(oid) || ';'
    ,''
    ,'ROLLBACK;'
    ,''
) as def
from pg_class
where relkind = 'i'
    and oid = $1

-- `.trim().slice(0, -2); });
