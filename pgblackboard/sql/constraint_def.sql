select format(
    concat_ws(e'\n'
        ,'BEGIN;'
        ,''
        ,'-- select and execute following line to drop constraint'
        ,'ALTER TABLE %%1$s DROP CONSTRAINT %%3$I;'
        ,''
        ,'ALTER TABLE %%1$s ADD CONSTRAINT %%3$I'
        ,'  %%2$s;'
        ,''
        ,'ROLLBACK;'
    )
    ,conrelid::regclass
    ,pg_get_constraintdef(%(oid)s::oid)
    ,conname
) as def
from pg_constraint where oid = %(oid)s::oid
