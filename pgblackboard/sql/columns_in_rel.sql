(
  select null as oid
      ,format('%%s : %%s %%s', attname,
                case when not attnotnull then 'nullable' end,
                format_type(atttypid, null)
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
      ,null as defquery
  from pg_attribute
      left outer join pg_index on indrelid = attrelid and
                                  attnum = any(indkey) and
                                  indisprimary
  where attrelid = %(oid)s and attnum > 0 and not attisdropped
  order by attnum


) union all (
  select oid
        ,conname as name
        ,obj_description(oid, 'pg_constraint') as comment
        ,case contype when 'f' then 'foreignkey constraint'
                      when 'u' then 'unique constraint'
                      when 'c' then 'check constraint'
                      end as type
        ,current_database() as database
        ,'constraint_def' as defquery
  from pg_constraint
  where contype in ('c', 'f', 'u')
      and conrelid = %(oid)s
) union all (

  select indexrelid
        ,relname as name
        ,obj_description(indexrelid, 'pg_class') as comment
        ,'index' as type
        ,current_database() as database
        ,'index_def' as defquery
  from pg_index
      join pg_class on indexrelid = oid
      left outer join pg_constraint on conindid = indexrelid
  where indrelid = %(oid)s
      and pg_constraint is null

) union all (

  select oid
        ,tgname as name
        ,obj_description(oid, 'pg_trigger') as comment
        ,'trigger' as type
        ,current_database() as database
        ,'trigger_def' as defquery
  from pg_trigger
  where tgrelid = %(oid)s
      and tgconstraint = 0

)
