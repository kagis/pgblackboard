(
    select relname as name
        ,obj_description(c.oid, 'pg_class') as comment
        ,c.oid as node
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
    from pg_class as c
        left outer join pg_depend as dep on c.oid = dep.objid
                                          and dep.classid = 'pg_class'::regclass
                                          and dep.deptype = 'e'
    where dep.refobjid = %(node)s and relkind in ('r', 'v', 'm', 'f')
    order by name

) union all (
    select format('%%s(%%s)'
            ,proname
            ,array_to_string(proargtypes::regtype[], ', ')
        ) as name
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
    where dep.refobjid = %(node)s
    order by name
)
