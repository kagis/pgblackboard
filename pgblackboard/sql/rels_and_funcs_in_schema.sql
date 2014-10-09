with params_cte as (
    with node_cte as ( select %(node)s::text as node )
    select case when node ilike 'schema_%%' then right(node, -7)::oid end as schema_oid
          ,case when node ilike 'ext_%%' then right(node, -4)::oid end as ext_oid
    from node_cte
)

(
    select extname                              as name
          ,obj_description(oid, 'pg_extension') as comment
          ,'ext_' || oid                        as node
          ,current_database()                   as database
          ,'extension_def'                      as defquery
          ,'rels_and_funcs_in_schema'           as childquery
          ,'extension'                          as type
    from pg_extension, params_cte
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
        ,pg_class.oid::text                            as node
        ,current_database()                            as database
        ,'table_def'                                   as defquery
        ,'columns_in_rel'                              as childquery
        ,case relkind when 'r' then 'table rel'
                      when 'v' then 'view rel'
                      when 'f' then 'foreigntable rel'
                      when 'm' then 'matview rel'
                      end                             as type
    from params_cte, pg_class left outer join ext_dep_cte on oid = objid
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
        ,pg_proc.oid::text                             as node
        ,current_database()                            as database
        ,case when proisagg then 'agg_def'
                            else 'func_def' end        as defquery
        ,null                                          as childquery
        ,case when proisagg then 'agg func'
                            else 'func' end            as type
    from params_cte, pg_proc left outer join ext_dep_cte on pg_proc.oid = objid
    where (pronamespace = schema_oid and refobjid is null)
          or refobjid = ext_oid
    order by name
)
