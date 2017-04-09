-- NaN; define((_r, _e, module) => { module.exports = `

WITH params_cte as (
    select split_part($1, '_', 1)::oid as attrelid
          ,split_part($1, '_', 2)::int as attnum
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
    ,'ORDER BY COUNT DESC'
    ,'   LIMIT 1000;'
    ,''

    ,'/*'
    ,concat_ws(' '
        ,altertable
        ,'ADD'
        ,attident
        ,upper(format_type(atttypid, atttypmod))
        ,case when attnotnull then 'NOT NULL' end
        ,'DEFAULT (' || adsrc || ')'
    ) || ';'
    ,(select string_agg(concat_ws(' '
            ,altertable
            ,'ADD CONSTRAINT'
            ,quote_ident(conname)
            ,e'\n '
            ,pg_get_constraintdef(oid) || ';'
        ), e'\n')
      from pg_constraint
      where conrelid = attrelid and conkey = array[attnum]::int2[]
    )
    ,'*/'
    ,''

    ,'/*'

    ,'-- rename column'
    ,altertable || ' RENAME ' || attident || ' TO ' || attident || ';'

    ,''
    ,'-- make column' || case when attnotnull then '' else ' NOT' end || ' nullable'
    ,altertable || ' ALTER  ' || attident || ' '
        || case when attnotnull then 'DROP' else 'SET' end
        || ' NOT NULL;'

    ,''
    ,'-- change column type'
    ,altertable || ' ALTER  ' || attident || ' SET TYPE text USING (' || attident || '::text);'

    ,''
    ,'-- drop column'
    ,altertable || ' DROP   ' || attident || ';'
    ,'*/'
    ,''
) as def
from common_cte

-- `.trim().slice(0, -2); });
