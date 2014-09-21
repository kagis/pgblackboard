select format(
    concat_ws(e'\n'
        ,'BEGIN;'
        ,''
        ,'-- select and execute following line to drop trigger'
        ,'DROP TRIGGER %%1$s ON %%2$s;'
        ,''
        ,'%%3$s;'
        ,''
        ,'ROLLBACK;'
    )
    ,tgname
    ,tgrelid::regclass
    ,pg_get_triggerdef(oid)
) as def
from pg_trigger
where oid = %(oid)s
