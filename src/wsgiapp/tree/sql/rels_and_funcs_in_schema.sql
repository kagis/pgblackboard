(select relname as name
    ,obj_description(oid, 'pg_class') as comment
    ,oid
    ,current_database() as database
    ,case relkind when 'r' then 'table_def'
                  when 'v' then 'view_def'
                  when 'm' then 'matview_def'
                  when 'f' then 'table_def'
                  end as defquery
    ,'columns_in_rel' as childquery
    ,case relkind when 'r' then 'table'
                  when 'v' then 'view'
                  when 'f' then 'foreigntable'
                  when 'm' then 'matview'
                  end as type
from pg_class
where relnamespace = $1 and relkind in ('r', 'v', 'm', 'f')
order by name
) union all (
select format('%s(%s)'
        ,proname
        ,array_to_string(proargtypes::regtype[], ', ')
    ) as name
    ,obj_description(oid, 'pg_proc') as comment
    ,oid
    ,current_database() as database
    ,'func_def' as defquery
    ,null as childquery
    ,'func' as type
from pg_proc
where pronamespace = $1
order by name)
