with parent_cte as (
    with params_cte as (
        select $1::oid    as parent_oid
              ,$2::text   as parent_type
    )
    select case parent_type when 'schema'    then parent_oid end as schema_oid
          ,case parent_type when 'extension' then parent_oid end as ext_oid
    from params_cte
)

(
    select current_database()                             as database
          ,oid                                            as id
          ,'extension'                                    as type
          ,extname                                        as name
          ,obj_description(oid, 'pg_extension')           as comment
          ,true                                           as has_children
    from pg_extension, parent_cte
    where extnamespace = schema_oid
    order by extname

) union all (
    with ext_dep_cte as (
        select objid, refobjid
        from pg_depend
        where classid = 'pg_class'::regclass and deptype = 'e'
    )
    select current_database()                            as database
          ,pg_class.oid                                  as id
          ,case relkind when 'r' then 'table'
                        when 'v' then 'view'
                        when 'f' then 'foreigntable'
                        when 'm' then 'matview'
                        end                              as type
          ,relname                                       as name
          ,obj_description(pg_class.oid, 'pg_class')     as comment
          ,true                                          as has_children
    from parent_cte, pg_class left outer join ext_dep_cte on oid = objid
    where relkind in ('r', 'v', 'm', 'f')
      and ((relnamespace = schema_oid and ext_dep_cte is null)
           or refobjid = ext_oid)
    order by name
) union all (
    with ext_dep_cte as (
        select objid, refobjid
        from pg_depend
        where classid = 'pg_proc'::regclass and deptype = 'e'
    )
    select current_database()                            as database
          ,pg_proc.oid                                   as id
          ,case when proisagg then 'agg'
                              else 'func' end            as type
          ,proname || '(' || array_to_string(proargtypes::regtype[], ', ') || ')' as name
          ,obj_description(pg_proc.oid, 'pg_proc')       as comment
          ,false                                         as has_children
    from parent_cte, pg_proc left outer join ext_dep_cte on pg_proc.oid = objid
    where (pronamespace = schema_oid and refobjid is null)
          or refobjid = ext_oid
    order by name
)
