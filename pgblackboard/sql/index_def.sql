select format(
    concat_ws(e'\n'
        ,'BEGIN;'
        ,''
        ,'-- select and execute following line to drop index'
        ,'DROP INDEX %%1$s;'
        ,''
        ,'%%2$s;'
        ,''
        ,'ROLLBACK;'
    )
    ,oid::regclass
    ,pg_get_indexdef(oid)
) as def
from pg_class
where relkind = 'i'
    and oid = %(node)s
