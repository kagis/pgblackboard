-- NaN; define((_r, _e, module) => { module.exports = `

  SELECT current_database()                   AS "database"
        ,oid                                  AS "id"
        ,'schema'                             AS "type"
        ,nspname                              AS "name"
        ,obj_description(oid, 'pg_namespace') AS "comment"
        ,true                                 AS "can_have_children"
        ,''                                   AS "group"
    FROM pg_namespace
   WHERE nspname NOT LIKE 'pg\_temp\_%'
     AND nspname NOT LIKE 'pg\_toast\_temp\_%'
     AND nspname != 'pg_toast'
ORDER BY name

-- `; });
