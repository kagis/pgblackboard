with params_cte as (
    select split_part(%(node)s, '_', 1)::oid as attrelid
          ,split_part(%(node)s, '_', 2)::int as attnum
),
common_cte as (
    select 'ALTER TABLE ' || attrelid::regclass as altertable
          ,quote_ident(attname) as attident
          ,*
    from params_cte
        inner join pg_attribute using (attrelid, attnum)
        left outer join pg_attrdef on adrelid = attrelid and adnum = attnum
)
select concat_ws(e'\n'
    ,'  SELECT ' || attident || ', COUNT(*)'
    ,'    FROM ' || attrelid::regclass
    ,'GROUP BY ' || attident
    ,'   LIMIT 1000;'
    ,''
    ,'/*'

    ,concat_ws(' '
        ,altertable
        ,'ADD   '
        ,attident
        ,upper(format_type(atttypid, atttypmod))
        ,case when attnotnull then 'NOT NULL' end
        ,'DEFAULT (' || adsrc || ')'
    ) || ';'
    ,altertable || ' RENAME ' || attident || ' TO ' || attident || ';'
    ,altertable || ' ALTER  ' || attident || ' SET '
        || case when attnotnull then 'NULL' else 'NOT NULL' end || ';'
    ,altertable || ' ALTER  ' || attident || ' SET TYPE text USING (' || attident || '::text);'
    ,altertable || ' DROP   ' || attident || ';'
    ,'*/'
) as def
from common_cte
