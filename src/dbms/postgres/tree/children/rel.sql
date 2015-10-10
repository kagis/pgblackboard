with param_cte as (
    select $1::oid as param_oid,
           $2::text
)
(
  select current_database()                                 as database
        ,concat_ws('_', attrelid, attnum)                   as id
        ,case when indisprimary then 'pkcolumn'
              when exists(select 1
                from pg_constraint
                where conrelid = attrelid and
                    attnum = any(conkey) and
                    contype = 'f') then 'fkcolumn'
              else 'column'
              end                                           as type
        ,concat_ws(' ', attname, ':'
            ,case when not attnotnull then 'nullable' end
            ,format_type(atttypid, null)
        )                                                   as name
        ,col_description(attrelid, attnum)                  as comment
        ,false                                              as has_children
        ,1                                                  as "group"
  from param_cte, pg_attribute
      left outer join pg_index on indrelid = attrelid and
                                  attnum = any(indkey) and
                                  indisprimary
  where attrelid = param_oid and attnum > 0 and not attisdropped
  order by attnum


) union all (
  select current_database()                                 as database
        ,oid::text                                          as id
        ,case contype when 'f' then 'foreignkey'
                      when 'u' then 'unique'
                      when 'c' then 'check'
                      end                                   as type
        ,conname                                            as name
        ,obj_description(oid, 'pg_constraint')              as comment
        ,false                                              as has_children
        ,2                                                  as "group"
  from param_cte, pg_constraint
  where contype in ('c', 'f', 'u')
      and conrelid = param_oid
) union all (

  select current_database()                                 as database
        ,indexrelid::text                                   as id
        ,'index'                                            as type
        ,relname                                            as name
        ,obj_description(indexrelid, 'pg_class')            as comment
        ,false                                              as has_children
        ,3                                                  as "group"
  from param_cte, pg_index
      join pg_class on indexrelid = oid
      left outer join pg_constraint on conindid = indexrelid
  where indrelid = param_oid
      and pg_constraint is null

) union all (

  select current_database()                                 as database
        ,oid::text                                          as id
        ,'trigger'                                          as type
        ,tgname                                             as name
        ,obj_description(oid, 'pg_trigger')                 as comment
        ,false                                              as has_children
        ,4                                                  as "group"
  from pg_trigger, param_cte
  where tgrelid = param_oid
      and tgconstraint = 0

)
