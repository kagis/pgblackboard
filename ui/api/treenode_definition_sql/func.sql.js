-- NaN; define((_r, _e, module) => { module.exports = `

select concat_ws(e'\n'
    ,'/*'
    ,'DROP FUNCTION ' || oid::regproc || '('
        || array_to_string(proargtypes::regtype[], ', ') || ');'
    ,'*/'
    ,''
    ,trim(trailing e' \n' from pg_get_functiondef(oid)) || ';'
    ,''
) as def
from pg_proc as p
where oid = $1

-- `.trim().slice(0, -2); });
