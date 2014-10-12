select concat_ws(e'\n'
    ,'/*'
    ,'CREATE SCHEMA ' || quote_ident(nspname) || ';'
    ,''
    ,'ALTER  SCHEMA ' || quote_ident(nspname) || ' RENAME TO ' || quote_ident(nspname) || ';'
    ,'*/'
) as def
from pg_namespace
where oid = %(nodeid)s
