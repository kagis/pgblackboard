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
     AND $1::text IS NOT NULL
     AND $2::text IS NOT NULL
ORDER BY name
