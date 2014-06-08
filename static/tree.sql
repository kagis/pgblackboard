---databases---
select datname as name
    ,shobj_description(oid, 'pg_database') as comment
    ,datname as database
    ,'schemas_in_db' as childquery
    ,'database' as type
from pg_database
where not datistemplate


---schemas_in_db---
select nspname as name
    ,oid
    ,obj_description(oid, 'pg_namespace') as comment
    ,current_database() as database
    ,'rels_and_funcs_in_schema' as childquery
    ,'schema' as type
from pg_namespace
where nspname not like 'pg\_temp\_%'
    and nspname not like 'pg\_toast\_temp\_%'
    and nspname != 'pg_toast'
order by name


---rels_and_funcs_in_schema---
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


---columns_in_rel---
select format('%s : %s', attname, format_type(atttypid, null)) as name
    ,col_description(attrelid, attnum) as comment
    ,case when indisprimary then 'pk_column'
          when exists(select 1
            from pg_constraint
            where conrelid = attrelid and
                attnum = any(conkey) and
                contype = 'f') then 'fk_column'
          else 'column'
          end as type
    ,current_database() as database
from pg_attribute
    left outer join pg_index on indrelid = attrelid and
                                attnum = any(indkey) and
                                indisprimary
where attrelid = $1 and attnum > 0 and not attisdropped
order by attnum


---table_def---
select format(e'select %s \nfrom %s \nlimit 1000;'
    ,string_agg(quote_ident(attname), e',\n    ' order by attnum)
    ,$1::int::regclass) as def
from pg_attribute
where attrelid = $1 and attnum > 0

---view_def---
select format(e'select %1$s \nfrom %2$s \nlimit 1000;\n\n'
           || e'/*\n CREATE VIEW %2$s AS\n%3$s\n*/'
    ,string_agg(quote_ident(attname), e',\n    ' order by attnum)
    ,$1::int::regclass
    ,pg_get_viewdef($1)) as def
from pg_attribute
where attrelid = $1 and attnum > 0

---matview_def---
select format(e'select %1$s \nfrom %2$s \nlimit 1000;\n\n'
           || e'/*\n CREATE MATERIALIZED VIEW %2$s AS\n%3$s\n*/'
    ,string_agg(quote_ident(attname), e',\n    ' order by attnum)
    ,$1::int::regclass
    ,pg_get_viewdef($1)) as def
from pg_attribute
where attrelid = $1 and attnum > 0


---func_def---
select pg_get_functiondef($1) as def
