export default `

with params_cte as (
    select $1::oid as param_oid
),
attrs_cte as (
    select pg_attribute.*, max(length(quote_ident(attname))) over() as max_attname_len
    from params_cte, pg_attribute join pg_class on pg_class.oid = attrelid
    where attrelid = param_oid and attnum > 0 and not attisdropped
),
attrs_def_cte as (
    select string_agg(
        concat_ws(' '
            ,rpad(quote_ident(attname), max_attname_len)
            ,upper(format_type(atttypid, atttypmod))
            ,'COLLATE "' || nullif(collname, 'default') || '"'
            ,case when attnotnull then 'NOT NULL' end
            ,'DEFAULT (' || adsrc || ')'
        )
        ,e'\n  ,'
        order by attnum
    ) as attrs_def
    from attrs_cte
      left outer join pg_attrdef on attrelid = adrelid and adnum = attnum
      left outer join pg_collation on pg_collation.oid = attcollation
),
constraints_def_cte as (
    with constraints_with_maxnamelen as (
        select max(length(quote_ident(conname))) over() as maxnamelen, oid, pg_constraint.*
        from pg_constraint, params_cte
        where conrelid = param_oid
    )
    select string_agg(
        'CONSTRAINT ' || rpad(quote_ident(conname), maxnamelen)
            || ' ' || pg_get_constraintdef(oid)
        ,e'\n  ,'
        order by strpos('pufc', contype)
    ) as constraints_def
    from constraints_with_maxnamelen
),
table_def_cte as (
    select case relkind
        when 'v' then e' CREATE VIEW ' || oid::regclass || e' AS\n' || pg_get_viewdef(oid)
        when 'm' then e' CREATE MATERIALIZED VIEW ' || oid::regclass || e' AS\n' || pg_get_viewdef(oid)
        when 'r' then 'CREATE TABLE ' || oid::regclass || e' (\n   '
            || concat_ws(e'\n\n  ,'
                ,(select attrs_def from attrs_def_cte)
                ,(select constraints_def from constraints_def_cte)
            )
            || e'\n)'
            || case when relhasoids then ' WITH OIDS' else '' end || ';'
        else ''
    end as table_def
    from pg_class, params_cte
    where oid = param_oid
),

select_attrs_cte as (
    select case when format_type(atttypid, null) in ('geometry', 'geography')
        then 'ST_AsGeoJSON(' || quote_ident(attname) || ')'
        else quote_ident(attname)
        end as colexpr
    from attrs_cte
    order by attnum
),

select_stmt_cte as (
    with pk_cols as (
        select quote_ident(attname) as attident
        from params_cte, pg_constraint
            join pg_attribute on contype = 'p'
                                and attnum = any(conkey)
                                and attrelid = conrelid
        where conrelid = param_oid
    )
    select concat_ws(e'\n'
        ,'  SELECT ' || string_agg(colexpr, e'\n        ,')
        ,'    FROM ' || (select param_oid::regclass from params_cte)
        ,'ORDER BY ' || (select string_agg(attident, ', ') from pk_cols)
    ) || ';' as select_stmt
    from select_attrs_cte
)
select select_stmt
    || e'\n\n/*\n'
    || table_def
    || e'\n*/\n' as def
  from select_stmt_cte, table_def_cte

`;
