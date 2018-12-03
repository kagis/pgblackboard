export default `

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
where relkind in ('i', 'I')
  and oid = $1

`;
