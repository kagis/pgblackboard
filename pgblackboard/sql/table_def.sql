with attrs_cte as (
    select pg_attribute.*, max(length(quote_ident(attname))) over() as max_attname_len
    from pg_attribute join pg_class on pg_class.oid = attrelid
    where attrelid = %(node)s and attnum > 0 and not attisdropped
),
attrs_def_cte as (
    select string_agg(
        concat_ws(' '
            ,rpad(quote_ident(attname), max_attname_len)
            ,upper(format_type(atttypid, atttypmod))
            ,case when attnotnull then 'NOT NULL' end
            ,'DEFAULT (' || adsrc || ')'
        )
        ,e'\n  ,'
        order by attnum
    ) as attrs_def
    from attrs_cte left outer join pg_attrdef on attrelid = adrelid and adnum = attnum
),
constraints_def_cte as (
    with constraints_with_maxnamelen as (
        select max(length(quote_ident(conname))) over() as maxnamelen, oid, *
        from pg_constraint
        where conrelid = %(node)s
    )
    select string_agg(
        format('CONSTRAINT %%s %%s'
            ,rpad(quote_ident(conname), maxnamelen)
            ,pg_get_constraintdef(oid)
        )
        ,e'\n  ,'
        order by strpos('pufc', contype)
    ) as constraints_def
    from constraints_with_maxnamelen
),
table_def_cte as (
    select case relkind
        when 'v' then format(
            e' CREATE VIEW %%s AS\n%%s'
            ,oid::regclass
            ,pg_get_viewdef(oid)
        )

        when 'm' then format(
            e' CREATE MATERIALIZED VIEW %%s AS\n%%s'
            ,oid::regclass
            ,pg_get_viewdef(oid)
        )

        when 'r' then format(
            e'CREATE TABLE %%s (\n   %%s\n)%%s;'
            ,oid::regclass
            ,concat_ws(e'\n\n  ,'
                ,(select attrs_def from attrs_def_cte)
                ,(select constraints_def from constraints_def_cte)
            )
            ,case when relhasoids then ' WITH OIDS' end
        )

        else ''
    end as table_def
    from pg_class
    where oid = %(node)s
),
select_stmt_cte as (
    select format(
        e'SELECT %%s\n  FROM %%s\n WHERE true\n LIMIT 1000;'
        ,string_agg(quote_ident(attname), e'\n      ,' order by attnum)
        ,%(node)s::regclass
    ) as select_stmt
    from attrs_cte
)
select format(
    e'%%s\n\n/*\n%%s\n*/\n'
    ,(select select_stmt from select_stmt_cte)
    ,(select table_def from table_def_cte)
) as def

