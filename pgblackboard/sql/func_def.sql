select concat_ws(e'\n'
    ,format('-- DROP FUNCTION %%s(%%s);'
        ,oid::regproc
        ,array_to_string(proargtypes::regtype[], ', ')
    )
    ,''
    ,pg_get_functiondef(oid)
) as def
from pg_proc as p
where oid = %(oid)s
