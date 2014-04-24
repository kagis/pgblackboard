---databases---
select datname as name
    ,shobj_description(oid, 'pg_database') as comment
from pg_database
where not datistemplate


---databaseChildren---
select nspname as name
    ,oid
    ,obj_description(oid, 'pg_namespace') as comment
from pg_namespace
where nspname not like 'pg\_temp\_%'
    and nspname not like 'pg\_toast_temp\_%'
    and nspname != 'pg_toast'
order by name


---schemaChildren---
(select 'table' as typ
    ,oid
    ,relname as name
    ,obj_description(oid, 'pg_class') as comment
from pg_class
where relnamespace = $1 and
    relkind in ('r', 'v', 'm', 'f')
order by name
) union all (
select 'func' as typ
    ,oid
    ,format('%s(%s)'
        ,proname
        ,array_to_string(proargtypes::regtype[], ', ')
    ) as name
    ,obj_description(oid, 'pg_proc') as comment
from pg_proc
where pronamespace = $1
order by name)


---tableChildren---
select format('%s : %s', attname, format_type(atttypid, null)) as name
    ,col_description(attrelid, attnum) as comment
from pg_attribute
where attrelid = $1 and attnum > 0
order by attnum


---tableDef---
select format(e'select %s \nfrom %s \nlimit 1000;'
    ,string_agg(quote_ident(attname), e',\n    ' order by attnum)
    ,$1::int::regclass) as def
from pg_attribute
where attrelid = $1 and attnum > 0


---funcDef---
select pg_get_functiondef($1) as def
