-- NaN; define((_r, _e, module) => { module.exports = `

WITH param_cte AS (
  SELECT $1::oid AS param_oid,
         $2::text
)
(
SELECT current_database()                                 AS "database"
      ,concat_ws('_', attrelid, attnum)                   AS "id"
      ,CASE WHEN indisprimary then 'pkcolumn'
            WHEN exists(SELECT 1
              FROM pg_constraint
              WHERE conrelid = attrelid AND
                  attnum = any(conkey) AND
                  contype = 'f') then 'fkcolumn'
            ELSE 'column'
            END                                           AS "type"
      ,concat_ws(' ', attname, ':'
          ,format_type(atttypid, atttypmod)
          ,CASE WHEN not attnotnull then 'nullable' END
      )                                                   AS "name"
      ,col_description(attrelid, attnum)                  AS "comment"
      ,false                                              AS "has_children"
      ,''                                                 AS "group"
FROM param_cte, pg_attribute
    LEFT OUTER JOIN pg_index ON indrelid = attrelid AND
                                attnum = any(indkey) AND
                                indisprimary
WHERE attrelid = param_oid AND attnum > 0 AND not attisdropped
order by attnum


) UNION all (
SELECT current_database()                                 AS "database"
      ,oid::text                                          AS "id"
      ,CASE contype WHEN 'f' then 'foreignkey'
                    WHEN 'u' then 'unique'
                    WHEN 'c' then 'check'
                    END                                   AS "type"
      ,conname                                            AS "name"
      ,obj_description(oid, 'pg_constraint')              AS "comment"
      ,false                                              AS "has_children"
      ,'constraints'                                      AS "group"
FROM param_cte, pg_constraint
WHERE contype in ('c', 'f', 'u')
    AND conrelid = param_oid
) UNION all (

SELECT current_database()                                 AS "database"
      ,indexrelid::text                                   AS "id"
      ,'index'                                            AS "type"
      ,relname                                            AS "name"
      ,obj_description(indexrelid, 'pg_class')            AS "comment"
      ,false                                              AS "has_children"
      ,'indexes'                                          AS "group"
FROM param_cte, pg_index
    JOIN pg_class ON indexrelid = oid
    LEFT OUTER JOIN pg_constraint ON conindid = indexrelid
WHERE indrelid = param_oid
    AND pg_constraint is NULL

) UNION all (

SELECT current_database()                                 AS "database"
      ,oid::text                                          AS "id"
      ,'trigger'                                          AS "type"
      ,tgname                                             AS "name"
      ,obj_description(oid, 'pg_trigger')                 AS "comment"
      ,false                                              AS "has_children"
      ,'triggers'                                         AS "group"
FROM pg_trigger, param_cte
WHERE tgrelid = param_oid
    AND tgconstraint = 0

)

-- `.trim().slice(0, -2); });
