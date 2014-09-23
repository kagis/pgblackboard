with param_cte as (
    select %(node)s::oid as param_oid
)
(
  select concat_ws('_', attrelid, attnum) as node
      ,concat_ws(' ', attname, ':'
          ,case when not attnotnull then 'nullable' end
          ,format_type(atttypid, null)
      ) as name
      ,col_description(attrelid, attnum) as comment
      ,case when indisprimary then 'pk_column column'
            when exists(select 1
              from pg_constraint
              where conrelid = attrelid and
                  attnum = any(conkey) and
                  contype = 'f') then 'fk_column column'
            else 'column'
            end as type
      ,current_database() as database
      ,'column_def' as defquery
  from param_cte, pg_attribute
      left outer join pg_index on indrelid = attrelid and
                                  attnum = any(indkey) and
                                  indisprimary
  where attrelid = param_oid and attnum > 0 and not attisdropped
  order by attnum


) union all (
  select oid::text as node
        ,conname as name
        ,obj_description(oid, 'pg_constraint') as comment
        ,case contype when 'f' then 'foreignkey constraint'
                      when 'u' then 'unique constraint'
                      when 'c' then 'check constraint'
                      end as type
        ,current_database() as database
        ,'constraint_def' as defquery
  from param_cte, pg_constraint
  where contype in ('c', 'f', 'u')
      and conrelid = param_oid
) union all (

  select indexrelid::text as node
        ,relname as name
        ,obj_description(indexrelid, 'pg_class') as comment
        ,'index' as type
        ,current_database() as database
        ,'index_def' as defquery
  from param_cte, pg_index
      join pg_class on indexrelid = oid
      left outer join pg_constraint on conindid = indexrelid
  where indrelid = param_oid
      and pg_constraint is null

) union all (

  select oid::text as node
        ,tgname as name
        ,obj_description(oid, 'pg_trigger') as comment
        ,'trigger' as type
        ,current_database() as database
        ,'trigger_def' as defquery
  from pg_trigger, param_cte
  where tgrelid = param_oid
      and tgconstraint = 0

)
