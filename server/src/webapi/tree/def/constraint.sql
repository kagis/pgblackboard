select concat_ws(e'\n'
    ,'BEGIN;'
    ,''
    ,'-- select and execute following line to drop constraint'
    ,'ALTER TABLE ' || conrelid::regclass || ' DROP CONSTRAINT ' || quote_ident(conname) || ';'
    ,''
    ,'ALTER TABLE ' || conrelid::regclass || ' ADD CONSTRAINT ' || quote_ident(conname)
    ,'  ' || pg_get_constraintdef(oid) || ';'
    ,''
    ,'ROLLBACK;'
    ,''
) as def
from pg_constraint where oid = %(nodeid)s::oid
