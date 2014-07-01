select format('%s : %s', attname, format_type(atttypid, null)) as name
    ,col_description(attrelid, attnum) as comment
    ,case when indisprimary then 'pk_column'
          when exists(select 1
            from pg_constraint
            where conrelid = attrelid and
                attnum = any(conkey) and
                contype = 'f') then 'fk_column'
          else 'column'
          end as type
    ,current_database() as database
from pg_attribute
    left outer join pg_index on indrelid = attrelid and
                                attnum = any(indkey) and
                                indisprimary
where attrelid = $1 and attnum > 0 and not attisdropped
order by attnum
