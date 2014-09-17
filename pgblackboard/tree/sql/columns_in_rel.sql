(
  select format('%%s : %%s', attname, format_type(atttypid, null)) as name
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
  from pg_attribute
      left outer join pg_index on indrelid = attrelid and
                                  attnum = any(indkey) and
                                  indisprimary
  where attrelid = %(oid)s and attnum > 0 and not attisdropped
  order by attnum
) union all (

  select relname as name
        ,obj_description(pg_class.oid, 'pg_class') as comment
        ,'index' as type
        ,current_database() as database
  from pg_index join pg_class on indexrelid = oid
  where indrelid = %(oid)s
      and not indisprimary

) union all (

  select tgname as name
        ,obj_description(oid, 'pg_trigger') as comment
        ,'trigger' as type
        ,current_database() as database
  from pg_trigger
  where tgrelid = %(oid)s
      and tgconstraint = 0

)
