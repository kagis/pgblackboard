select concat_ws(e'\n'
    ,'BEGIN;'
    ,''
    ,'-- select and execute following line to drop trigger'
    ,'DROP TRIGGER ' || quote_ident(tgname) || ' ON ' || tgrelid::regclass || ';'
    ,''
    ,pg_get_triggerdef(oid) || ';'
    ,''
    ,'ROLLBACK;'
    ,''
) as def
from pg_trigger
where oid = %(nodeid)s
