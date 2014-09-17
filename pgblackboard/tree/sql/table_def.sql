select format(e'select %%s\n  from %%s\n limit 1000;'
    ,string_agg(quote_ident(attname), e',\n       ' order by attnum)
    ,%(oid)s::int::regclass) as def
from pg_attribute
where attrelid = %(oid)s and attnum > 0 and not attisdropped
