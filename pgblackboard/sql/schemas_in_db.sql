select nspname as name
    ,'schema_' || oid as node
    ,obj_description(oid, 'pg_namespace') as comment
    ,current_database() as database
    ,'rels_and_funcs_in_schema' as childquery
    ,'schema' as type
    ,'schema_def' as defquery
from pg_namespace
where nspname not like 'pg\_temp\_%%'
    and nspname not like 'pg\_toast\_temp\_%%'
    and nspname != 'pg_toast'
order by name
