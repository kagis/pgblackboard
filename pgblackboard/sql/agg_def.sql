with agg_cte as (
    select *
    from pg_proc join pg_aggregate on oid = aggfnoid
    where aggfnoid = %(node)s
)
select concat_ws(e'\n'
    ,'/*'
    ,'DROP AGGREGATE ' || aggfnoid || '('
        || array_to_string(proargtypes::regtype[], ', ') || ');'
    ,'*/'
    ,''
    ,'CREATE AGGREGATE ' || aggfnoid || '('
        || array_to_string(proargtypes::regtype[], ', ') || ') ('
    ,'   SFUNC       = ' || aggtransfn
    ,'  ,STYPE       = ' || format_type(aggtranstype, null)
    ,'  ,FINALFUNC   = ' || nullif(aggfinalfn, 0)::regproc
    ,'  ,INITCOND    = ' || array_to_string(agginitval::text[], ', ')
    ,'  ,SORTOP      = ' || nullif(aggsortop, 0)::regoperator
    ,');'
    ,''
) as def
from agg_cte
