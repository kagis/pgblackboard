with parent_cte as (
    with params_cte as (
        select %(nodeid)s::oid    as parent_oid
              ,%(nodetype)s::text as parent_type
    )
    select case parent_type when 'schema'    then parent_oid end as schema_oid
          ,case parent_type when 'extension' then parent_oid end as ext_oid
    from params_cte
)

(
    select extname                              as name
          ,obj_description(oid, 'pg_extension') as comment
          ,oid                                  as id
          ,'extension'                          as type
    from pg_extension, parent_cte
    where extnamespace = schema_oid
    order by extname

) union all (
    with ext_dep_cte as (
        select objid, refobjid
        from pg_depend
        where classid = 'pg_class'::regclass and deptype = 'e'
    )
    select relname                                     as name
        ,obj_description(pg_class.oid, 'pg_class')     as comment
        ,pg_class.oid                                  as id
        ,case relkind when 'r' then 'table'
                      when 'v' then 'view'
                      when 'f' then 'foreigntable'
                      when 'm' then 'matview'
                      end                             as type
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
    select proname || '(' || array_to_string(proargtypes::regtype[], ', ') || ')' as name
        ,obj_description(pg_proc.oid, 'pg_proc')       as comment
        ,pg_proc.oid                                   as id
        ,case when proisagg then 'agg'
                            else 'func' end            as type
    from parent_cte, pg_proc left outer join ext_dep_cte on pg_proc.oid = objid
    where (pronamespace = schema_oid and refobjid is null)
          or refobjid = ext_oid
    order by name
)
