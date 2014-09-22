(
    select extname as name
          ,obj_description(oid, 'pg_extension') as comment
          ,oid
          ,current_database() as database
          ,null as defquery
          ,'extension_children' as childquery
          ,'extension' as type
    from pg_extension
    where extnamespace = %(oid)s
    order by extname

) union all (
    select relname as name
        ,obj_description(c.oid, 'pg_class') as comment
        ,c.oid
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
    where relnamespace = %(oid)s and relkind in ('r', 'v', 'm', 'f') and dep is null
    order by name

) union all (
    select format('%%s(%%s)'
            ,proname
            ,array_to_string(proargtypes::regtype[], ', ')
        ) as name
        ,obj_description(p.oid, 'pg_proc') as comment
        ,p.oid
        ,current_database() as database
        ,'func_def' as defquery
        ,null as childquery
        ,'func' as type
    from pg_proc as p
        left outer join pg_depend as dep on p.oid = dep.objid
                                          and dep.classid = 'pg_proc'::regclass
                                          and dep.deptype = 'e'
    where pronamespace = %(oid)s and dep is null
    order by name
)
