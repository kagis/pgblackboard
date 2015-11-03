  SELECT datname                               AS "database"
        ,datname                               AS "id"
        ,'database'                            AS "typ"
        ,datname                               AS "name"
        ,shobj_description(oid, 'pg_database') AS "comment"
        ,true                                  AS "has_children"
    FROM pg_database
   WHERE NOT datistemplate
ORDER BY datname
