define(function (require, exports, module) {
  'use strict'
  const sqlQuery = require('webapi/sqlQuery')
  module.exports = fetchChildren;
  
  function fetchChildren(database, parentType, parentId) {
    return sqlQuery({
      statement: getChildrenQuery(parentType),
      username: 'postgres',
      password: 'postgres',
      database,
      fields: {
        database: true,
        id: true,
        type: true,
        name: true,
        comment: true,
        canHaveChildren: true,
        group: true,
      }
    })  
  }
  
  function getChildrenQuery(parentType) {
    switch (parentType) {
      case 'database':
        return `
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
        `
      
      case 'schema':
      case 'ext':
        return `
          with parent_cte as (
              with params_cte as (
                  select $1::oid    as parent_oid
                        ,$2::text   as parent_type
              )
              select case parent_type when 'schema'    then parent_oid end as schema_oid
                    ,case parent_type when 'extension' then parent_oid end as ext_oid
              from params_cte
          )
          
          (
              select current_database()                             as "database"
                    ,oid                                            as "id"
                    ,'extension'                                    as "type"
                    ,extname                                        as "name"
                    ,obj_description(oid, 'pg_extension')           as "comment"
                    ,true                                           as "can_have_children"
                    ,''                                             as "group"
              from pg_extension, parent_cte
              where extnamespace = schema_oid
              order by extname
          
          ) union all (
              with ext_dep_cte as (
                  select objid, refobjid
                  from pg_depend
                  where classid = 'pg_class'::regclass and deptype = 'e'
              )
              select current_database()                            as "database"
                    ,pg_class.oid                                  as "id"
                    ,case relkind when 'r' then 'table'
                                  when 'v' then 'view'
                                  when 'f' then 'foreigntable'
                                  when 'm' then 'matview'
                                  end                              as "type"
                    ,relname                                       as "name"
                    ,obj_description(pg_class.oid, 'pg_class')     as "comment"
                    ,true                                          as "can_have_children"
                    ,''                                            as "group"
              from parent_cte, pg_class left outer join ext_dep_cte on oid = objid
              where relkind in ('r', 'v', 'm', 'f')
                and ((relnamespace = schema_oid and ext_dep_cte is null)
                     or refobjid = ext_oid)
              order by name
          ) union all (
              with ext_dep_cte as (
                  select objid, refobjid
                  from pg_depend
                  where classid = 'pg_proc'::regclass and deptype = 'e'
              )
              select current_database()                            as "database"
                    ,pg_proc.oid                                   as "id"
                    ,case when proisagg then 'agg'
                                        else 'func' end            as "type"
                    ,proname || '(' || array_to_string(proargtypes::regtype[], ', ') || ')' as "name"
                    ,obj_description(pg_proc.oid, 'pg_proc')       as "comment"
                    ,false                                         as "can_have_children"
                    ,''                                            as "group"
              from parent_cte, pg_proc left outer join ext_dep_cte on pg_proc.oid = objid
              where (pronamespace = schema_oid and refobjid is null)
                    or refobjid = ext_oid
              order by name
          )
        `
          
      case 'table':
        return `
          with param_cte as (
              select $1::oid as param_oid,
                     $2::text
          )
          (
            select current_database()                                 as database
                  ,concat_ws('_', attrelid, attnum)                   as id
                  ,case when indisprimary then 'pkcolumn'
                        when exists(select 1
                          from pg_constraint
                          where conrelid = attrelid and
                              attnum = any(conkey) and
                              contype = 'f') then 'fkcolumn'
                        else 'column'
                        end                                           as type
                  ,concat_ws(' ', attname, ':'
                      ,case when not attnotnull then 'nullable' end
                      ,format_type(atttypid, atttypmod)
                  )                                                   as name
                  ,col_description(attrelid, attnum)                  as comment
                  ,false                                              as has_children
                  ,''                                                 as "group"
            from param_cte, pg_attribute
                left outer join pg_index on indrelid = attrelid and
                                            attnum = any(indkey) and
                                            indisprimary
            where attrelid = param_oid and attnum > 0 and not attisdropped
            order by attnum
          
          
          ) union all (
            select current_database()                                 as database
                  ,oid::text                                          as id
                  ,case contype when 'f' then 'foreignkey'
                                when 'u' then 'unique'
                                when 'c' then 'check'
                                end                                   as type
                  ,conname                                            as name
                  ,obj_description(oid, 'pg_constraint')              as comment
                  ,false                                              as has_children
                  ,'constraints'                                      as "group"
            from param_cte, pg_constraint
            where contype in ('c', 'f', 'u')
                and conrelid = param_oid
          ) union all (
          
            select current_database()                                 as database
                  ,indexrelid::text                                   as id
                  ,'index'                                            as type
                  ,relname                                            as name
                  ,obj_description(indexrelid, 'pg_class')            as comment
                  ,false                                              as has_children
                  ,'indexes'                                          as "group"
            from param_cte, pg_index
                join pg_class on indexrelid = oid
                left outer join pg_constraint on conindid = indexrelid
            where indrelid = param_oid
                and pg_constraint is null
          
          ) union all (
          
            select current_database()                                 as database
                  ,oid::text                                          as id
                  ,'trigger'                                          as type
                  ,tgname                                             as name
                  ,obj_description(oid, 'pg_trigger')                 as comment
                  ,false                                              as has_children
                  ,'triggers'                                         as "group"
            from pg_trigger, param_cte
            where tgrelid = param_oid
                and tgconstraint = 0
          
          )
        `
    }
  }
  
  const childrenOfDatabase = (parentType, parentId) => 
  
  const childrenOfSchemaOrExt = 
})