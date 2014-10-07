(
    select extname as name
          ,obj_description(oid, 'pg_extension') as comment
          ,oid as node
          ,current_database() as database
          ,'extension_def' as defquery
          ,'extension_children' as childquery
          ,'extension' as type
    from pg_extension
    where extnamespace = %(node)s
    order by extname

) union all (
    select relname as name
        ,obj_description(c.oid, 'pg_class') as comment
        ,c.oid as node
        ,current_database() as database
        ,'table_def' as defquery
        ,'columns_in_rel' as childquery
        ,case relkind when 'r' then 'table rel'
                      when 'v' then 'view rel'
                      when 'f' then 'foreigntable rel'
                      when 'm' then 'matview rel'
                      end as type
    from pg_class as c
        left outer join pg_depend as dep on c.oid = dep.objid
                                      and dep.classid = 'pg_class'::regclass
                                      and dep.deptype = 'e'
    where relnamespace = %(node)s and relkind in ('r', 'v', 'm', 'f') and dep is null
    order by name

) union all (
    select proname || '(' || array_to_string(proargtypes::regtype[], ', ') || ')' as name
        ,obj_description(p.oid, 'pg_proc') as comment
        ,p.oid as node
        ,current_database() as database
        ,'func_def' as defquery
        ,null as childquery
        ,'func' as type
    from pg_proc as p
        left outer join pg_depend as dep on p.oid = dep.objid
                                          and dep.classid = 'pg_proc'::regclass
                                          and dep.deptype = 'e'
    where pronamespace = %(node)s and dep is null
    order by name
)
