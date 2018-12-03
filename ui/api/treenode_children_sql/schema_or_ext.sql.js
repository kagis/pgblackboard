export default `

WITH parent_cte AS (
  WITH params_cte AS (
      SELECT $1::oid    AS parent_oid
            ,$2::text   AS parent_type
  )
  SELECT CASE parent_type WHEN 'schema'    THEN parent_oid END AS schema_oid
        ,CASE parent_type WHEN 'extension' THEN parent_oid END AS ext_oid
  FROM params_cte
)

(
  SELECT current_database()                             AS "database"
        ,oid                                            AS "id"
        ,'extension'                                    AS "type"
        ,extname                                        AS "name"
        ,obj_description(oid, 'pg_extension')           AS "comment"
        ,true                                           AS "can_have_children"
        ,''                                             AS "group"
  FROM pg_extension, parent_cte
  WHERE extnamespace = schema_oid
  ORDER BY extname

) UNION all (
  WITH ext_dep_cte AS (
      SELECT objid, refobjid
      FROM pg_depend
      WHERE classid = 'pg_class'::regclass AND deptype = 'e'
  )
  SELECT current_database()                            AS "database"
        ,pg_class.oid                                  AS "id"
        ,CASE relkind WHEN 'r' then 'table'
                      WHEN 'p' then 'table'
                      WHEN 'v' then 'view'
                      WHEN 'f' then 'foreigntable'
                      WHEN 'm' then 'matview'
                      END                              AS "type"
        ,relname                                       AS "name"
        ,obj_description(pg_class.oid, 'pg_class')     AS "comment"
        ,true                                          AS "can_have_children"
        ,''                                            AS "group"
  FROM parent_cte, pg_class LEFT OUTER JOIN ext_dep_cte ON oid = objid
  WHERE relkind IN ('p', 'r', 'v', 'm', 'f')
    AND ((relnamespace = schema_oid AND ext_dep_cte IS NULL)
         OR refobjid = ext_oid)
  ORDER BY name
) UNION all (
  WITH ext_dep_cte AS (
      SELECT objid, refobjid
      FROM pg_depend
      WHERE classid = 'pg_proc'::regclass AND deptype = 'e'
  )
  SELECT current_database()                            AS "database"
        ,pg_proc.oid                                   AS "id"
        ,CASE WHEN pg_aggregate IS NULL THEN 'func' ELSE 'agg' END AS "type"
        ,proname || '(' || array_to_string(proargtypes::regtype[], ', ') || ')' AS "name"
        ,obj_description(pg_proc.oid, 'pg_proc')       AS "comment"
        ,false                                         AS "can_have_children"
        ,''                                            AS "group"
  FROM parent_cte, pg_proc LEFT OUTER JOIN ext_dep_cte ON pg_proc.oid = objid
    LEFT OUTER JOIN pg_aggregate ON aggfnoid = pg_proc.oid
  WHERE (pronamespace = schema_oid AND refobjid is NULL)
        OR refobjid = ext_oid
  ORDER BY name
)

`;
