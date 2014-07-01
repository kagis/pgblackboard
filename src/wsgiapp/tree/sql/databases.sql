select datname as name
    ,shobj_description(oid, 'pg_database') as comment
    ,datname as database
    ,'schemas_in_db' as childquery
    ,'database' as type
from pg_database
where not datistemplate
